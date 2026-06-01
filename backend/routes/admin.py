from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid
import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, EmailStr

from core.config import settings
from core.database import get_db
from core.deps import get_current_admin
from core.email import send_email, wrap_email
from models.contact import Testimonial, TestimonialCreate
from models.product import Product, ProductCreate, ProductUpdate
from models.license import License, LicenseCreate
from models.order import Order
from services.seed import generate_license_key


class SendEmailRequest(BaseModel):
    to: EmailStr
    subject: str
    body: str


class ManualLicenseCreate(BaseModel):
    key: str | None = None  # if None, we'll generate one
    user_id: str
    user_email: str
    product_id: str
    product_name: str
    order_id: str | None = None
    status: str = "active"
    expires_at: str | None = None  # ISO format
    max_activations: int = 2

STORAGE_DIR = Path(__file__).parent.parent / "storage"
PRODUCT_IMAGES_DIR = STORAGE_DIR / "product-images"
PRODUCTS_DIR = STORAGE_DIR / "products"
LICENSES_DIR = STORAGE_DIR / "licenses"

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOWNLOAD_EXTENSIONS = {".zip", ".ex5", ".mq5", ".ex4", ".mq4", ".bin", ".pdf", ".txt", ".json"}
MAX_FILE_SIZE = 50 * 1024 * 1024

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


def _clean(d):
    d.pop("_id", None)
    return d


# ---- Dashboard summary ----
@router.get("/summary")
async def summary():
    db = get_db()
    users = await db.users.count_documents({})
    products = await db.products.count_documents({})
    orders_paid = await db.orders.count_documents({"status": "paid"})
    revenue_pipeline = await db.orders.aggregate(
        [{"$match": {"status": "paid"}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    ).to_list(1)
    revenue = revenue_pipeline[0]["total"] if revenue_pipeline else 0
    leads = await db.contact_submissions.count_documents({})
    licenses_active = await db.licenses.count_documents({"status": "active"})
    return {
        "users": users,
        "products": products,
        "paid_orders": orders_paid,
        "revenue": revenue,
        "leads": leads,
        "active_licenses": licenses_active,
    }


# ---- Products ----
@router.get("/products")
async def admin_list_products():
    db = get_db()
    docs = await db.products.find({}).sort("created_at", 1).to_list(500)
    return [_clean(d) for d in docs]


@router.post("/products")
async def admin_create_product(payload: ProductCreate):
    db = get_db()
    if await db.products.find_one({"slug": payload.slug}):
        raise HTTPException(status_code=400, detail="Slug already exists")
    product = Product(**payload.model_dump())
    await db.products.insert_one(product.model_dump())
    return _clean(product.model_dump())


@router.patch("/products/{product_id}")
async def admin_update_product(product_id: str, payload: ProductUpdate):
    db = get_db()
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc)
    result = await db.products.update_one({"id": product_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    doc = await db.products.find_one({"id": product_id})
    return _clean(doc)


@router.delete("/products/{product_id}")
async def admin_delete_product(product_id: str):
    db = get_db()
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


# ---- Users ----
@router.get("/users")
async def admin_list_users():
    db = get_db()
    docs = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).to_list(500)
    return [_clean(d) for d in docs]


@router.patch("/users/{user_id}/role")
async def admin_set_role(user_id: str, role: str):
    if role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    db = get_db()
    await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    return {"ok": True}


@router.patch("/users/{user_id}/active")
async def admin_toggle_active(user_id: str, is_active: bool):
    db = get_db()
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": is_active}})
    return {"ok": True}


# ---- Orders ----
@router.get("/orders")
async def admin_list_orders():
    db = get_db()
    docs = await db.orders.find({}).sort("created_at", -1).to_list(500)
    return [_clean(d) for d in docs]


@router.post("/orders/{order_id}/activate")
async def admin_activate_order(order_id: str):
    db = get_db()
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be activated")
    
    products = []
    for item in order["items"]:
        p = await db.products.find_one({"id": item["product_id"]})
        if p:
            products.append(p)
    
    order_obj = Order(**{k: v for k, v in order.items() if k != "_id"})
    
    # Grant licenses
    license_ids = []
    for prod in products:
        duration = prod.get("subscription_tiers")
        if duration and len(duration) > 0:
            # Assume first tier or use subscription_duration from order
            if order.get("subscription_duration"):
                tier_duration = order["subscription_duration"]
            else:
                tier_duration = duration[0].get("license_duration_days", 30)
        else:
            tier_duration = prod.get("license_duration_days", 30)

        expires_at = None
        if tier_duration:
            expires_at = datetime.now(timezone.utc) + timedelta(days=int(tier_duration))
            
        lic = License(
            key=generate_license_key(),
            user_id=order["user_id"],
            user_email=order["user_email"],
            product_id=prod["id"],
            product_name=prod["name"],
            order_id=order["id"],
            expires_at=expires_at,
        )
        await db.licenses.insert_one(lic.model_dump())
        license_ids.append(lic.id)
    
    # Calculate subscription duration
    subscription_duration = None
    if order.get("subscription_duration"):
        subscription_duration = order["subscription_duration"]
    else:
        for prod in products:
            if prod.get("subscription_tiers"):
                subscription_duration = prod["subscription_tiers"][0].get("license_duration_days", 30)
                break
    if not subscription_duration:
        subscription_duration = products[0].get("license_duration_days", 30) if products else 30
    
    now = datetime.now(timezone.utc)
    updates = {
        "status": "active",
        "license_ids": license_ids,
        "activated_at": now,
        "updated_at": now
    }
    
    if subscription_duration:
        updates["subscription_expires_at"] = now + timedelta(days=subscription_duration)
    
    await db.orders.update_one({"id": order_id}, {"$set": updates})
    
    # Send purchase email
    lic_docs = await db.licenses.find({"id": {"$in": license_ids}}).to_list(50)
    lines = "".join(
        f"<li><strong>{lic['product_name']}</strong><br>"
        f"<code style='font-size:13px;color:#A5B4FC'>{lic['key']}</code></li>"
        for lic in lic_docs
    )
    body_html = (
        "<p>Your SpikeBulls order is confirmed. Below are your license keys:</p>"
        f"<ul>{lines}</ul>"
        "<p>Find your downloads and license keys anytime in your dashboard.</p>"
    )
    try:
        await send_email(
            to=order["user_email"],
            subject="Your SpikeBulls licenses are ready",
            html=wrap_email("Order confirmed", body_html, "Open dashboard", f"{settings.APP_URL}/dashboard"),
            meta={"type": "purchase", "order_id": order["id"]},
        )
    except Exception:
        pass
    
    updated_order = await db.orders.find_one({"id": order_id})
    return _clean(updated_order)


@router.post("/orders/{order_id}/reject")
async def admin_reject_order(order_id: str):
    db = get_db()
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be rejected")
    
    now = datetime.now(timezone.utc)
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "rejected", "updated_at": now}}
    )
    updated_order = await db.orders.find_one({"id": order_id})
    return _clean(updated_order)


# ---- Leads / Contact submissions ----
@router.get("/leads")
async def admin_list_leads():
    db = get_db()
    docs = await db.contact_submissions.find({}).sort("created_at", -1).to_list(500)
    return [_clean(d) for d in docs]


@router.patch("/leads/{lead_id}")
async def admin_update_lead(lead_id: str, status: str):
    if status not in ("new", "in_progress", "closed"):
        raise HTTPException(status_code=400, detail="Invalid status")
    db = get_db()
    await db.contact_submissions.update_one({"id": lead_id}, {"$set": {"status": status}})
    return {"ok": True}


# ---- Licenses ----
@router.get("/licenses")
async def admin_list_licenses():
    db = get_db()
    docs = await db.licenses.find({}).sort("created_at", -1).to_list(500)
    return [_clean(d) for d in docs]


@router.post("/licenses/{license_id}/revoke")
async def admin_revoke_license(license_id: str):
    db = get_db()
    await db.licenses.update_one({"id": license_id}, {"$set": {"status": "revoked"}})
    return {"ok": True}


@router.post("/licenses/{license_id}/regenerate")
async def admin_regenerate_license(license_id: str):
    db = get_db()
    new_key = generate_license_key()
    await db.licenses.update_one(
        {"id": license_id},
        {"$set": {"key": new_key, "status": "active", "activations": 0}},
    )
    return {"ok": True, "key": new_key}


@router.post("/licenses")
async def admin_create_license(payload: ManualLicenseCreate):
    from datetime import datetime, timezone
    db = get_db()

    # Prepare the license data
    license_data = {
        "id": str(uuid.uuid4()),
        "key": payload.key or generate_license_key(),
        "user_id": payload.user_id,
        "user_email": payload.user_email,
        "product_id": payload.product_id,
        "product_name": payload.product_name,
        "order_id": payload.order_id,
        "status": payload.status,
        "activations": 0,
        "max_activations": payload.max_activations,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    if payload.expires_at:
        try:
            license_data["expires_at"] = datetime.fromisoformat(payload.expires_at).astimezone(timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid expires_at format. Use ISO 8601 (e.g., 2025-12-31T23:59:59Z)")

    # Insert the license into DB
    await db.licenses.insert_one(license_data)

    # Clean and return
    license_data.pop("_id", None)
    return _clean(license_data)


@router.post("/licenses/{license_id}/upload")
async def admin_upload_license_file(
    license_id: str,
    file: UploadFile = File(...)
):
    db = get_db()
    license = await db.licenses.find_one({"id": license_id})
    if not license:
        raise HTTPException(status_code=404, detail="License not found")
    
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE // (1024*1024)}MB")
    
    file_ext = Path(file.filename).suffix.lower() if file.filename else ".bin"
    if file_ext not in ALLOWED_DOWNLOAD_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed extensions: {', '.join(ALLOWED_DOWNLOAD_EXTENSIONS)}")
    
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = f"{unique_id}_{file.filename.replace(' ', '_') if file.filename else f'file{file_ext}'}"
    LICENSES_DIR.mkdir(parents=True, exist_ok=True)
    save_path = LICENSES_DIR / safe_filename
    
    with open(save_path, "wb") as f:
        f.write(content)
    
    await db.licenses.update_one(
        {"id": license_id},
        {"$set": {"file_path": safe_filename, "updated_at": datetime.now(timezone.utc)}}
    )
    
    updated_license = await db.licenses.find_one({"id": license_id})
    return {"ok": True, "file_path": safe_filename, "license": _clean(updated_license)}


# ---- Testimonials ----
@router.get("/testimonials")
async def admin_list_testimonials():
    db = get_db()
    docs = await db.testimonials.find({}).sort("created_at", 1).to_list(100)
    return [_clean(d) for d in docs]


@router.post("/testimonials")
async def admin_create_testimonial(payload: TestimonialCreate):
    db = get_db()
    t = Testimonial(**payload.model_dump())
    await db.testimonials.insert_one(t.model_dump())
    return _clean(t.model_dump())


@router.delete("/testimonials/{tid}")
async def admin_delete_testimonial(tid: str):
    db = get_db()
    await db.testimonials.delete_one({"id": tid})
    return {"ok": True}


# ---- File Upload ----
@router.post("/products/{product_id}/upload")
async def admin_upload_product_file(
    product_id: str,
    file: UploadFile = File(...),
    type: str = Form(...)
):
    db = get_db()
    
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if type not in ("image", "download"):
        raise HTTPException(status_code=400, detail="Invalid type. Must be 'image' or 'download'")
    
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_FILE_SIZE // (1024*1024)}MB")
    
    file_ext = Path(file.filename).suffix.lower() if file.filename else ".bin"
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = f"{unique_id}_{file.filename.replace(' ', '_') if file.filename else f'file{file_ext}'}"
    
    if type == "image":
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid image type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}")
        save_dir = PRODUCT_IMAGES_DIR
        save_path = save_dir / safe_filename
        field_to_update = "images"
    else:
        if file_ext not in ALLOWED_DOWNLOAD_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Invalid download type. Allowed extensions: {', '.join(ALLOWED_DOWNLOAD_EXTENSIONS)}")
        save_dir = PRODUCTS_DIR
        save_path = save_dir / safe_filename
        field_to_update = "file_path"
    
    save_dir.mkdir(parents=True, exist_ok=True)
    
    with open(save_path, "wb") as f:
        f.write(content)
    
    updates = {"updated_at": datetime.now(timezone.utc)}
    
    if type == "image":
        current_images = product.get("images", [])
        current_images.append(safe_filename)
        updates["images"] = current_images
    else:
        updates["file_path"] = safe_filename
        updates["delivery_type"] = "download"
    
    await db.products.update_one({"id": product_id}, {"$set": updates})
    
    updated_product = await db.products.find_one({"id": product_id})
    
    return {
        "ok": True,
        "file_path": safe_filename,
        "type": type,
        "product": _clean(updated_product)
    }


# ---- Send Email ----
@router.post("/send-email")
async def admin_send_email(payload: SendEmailRequest):
    try:
        await send_email(
            to=payload.to,
            subject=payload.subject,
            html=wrap_email(
                title=payload.subject,
                body_html=payload.body.replace("\n", "<br>")
            ),
        )
        return {"ok": True, "message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
