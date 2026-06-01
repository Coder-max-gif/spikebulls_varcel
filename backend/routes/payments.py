import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from core.config import settings
from core.database import get_db
from core.deps import get_current_user, get_current_admin
from core.email import send_email, wrap_email
from models.license import License
from models.order import CheckoutCreate, Order, OrderItem, ManualPaymentSubmit
from services import binance_service
from services.seed import generate_license_key

router = APIRouter(prefix="/payments", tags=["payments"])

STORAGE_DIR = Path(__file__).parent.parent / "storage" / "payment_proofs"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


async def _build_order(user: dict, product_ids: list[str]) -> tuple[Order, list[dict]]:
    db = get_db()
    items: list[OrderItem] = []
    products: list[dict] = []
    for pid in product_ids:
        prod = await db.products.find_one({"id": pid, "status": "active"})
        if not prod:
            raise HTTPException(status_code=400, detail=f"Invalid product: {pid}")
        items.append(OrderItem(product_id=prod["id"], name=prod["name"], price=prod["price"]))
        products.append(prod)
    subtotal = sum(i.price * i.quantity for i in items)
    order = Order(
        user_id=user["id"],
        user_email=user["email"],
        items=items,
        subtotal=subtotal,
        total=subtotal,
    )
    return order, products


async def _grant_licenses(order: Order, products: list[dict]) -> list[str]:
    db = get_db()
    license_ids: list[str] = []
    for prod in products:
        duration = prod.get("subscription_tiers")
        if duration and len(duration) > 0:
            # Assume first tier or use subscription_duration from order
            if order.subscription_duration:
                tier_duration = order.subscription_duration
            else:
                tier_duration = duration[0].get("license_duration_days", 30)
        else:
            tier_duration = 30

        expires_at = datetime.now(timezone.utc) + timedelta(days=int(tier_duration))
        lic = License(
            key=generate_license_key(),
            user_id=order.user_id,
            user_email=order.user_email,
            product_id=prod["id"],
            product_name=prod["name"],
            order_id=order.id,
            expires_at=expires_at,
        )
        await db.licenses.insert_one(lic.model_dump())
        license_ids.append(lic.id)
    return license_ids


async def _send_purchase_email(order: Order, products: list[dict], license_ids: list[str]) -> None:
    db = get_db()
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
            to=order.user_email,
            subject="Your SpikeBulls licenses are ready",
            html=wrap_email("Order confirmed", body_html, "Open dashboard", f"{settings.APP_URL}/dashboard"),
            meta={"type": "purchase", "order_id": order.id},
        )
    except Exception:
        pass


@router.post("/upload")
async def upload_payment_proof(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    db = get_db()
    file_extension = file.filename.split(".")[-1].lower()
    allowed_extensions = {"jpg", "jpeg", "png", "pdf", "webp"}
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    file_id = str(uuid.uuid4())
    file_name = f"{file_id}.{file_extension}"
    file_path = STORAGE_DIR / file_name
    
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    return {"url": f"{settings.BACKEND_URL}/storage/payment_proofs/{file_name}"}


@router.post("/binance/submit-payment")
async def submit_binance_payment(
    payload: ManualPaymentSubmit,
    user=Depends(get_current_user),
):
    db = get_db()
    order = await db.orders.find_one({"id": payload.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")
    if order["status"] not in ["pending"]:
        raise HTTPException(status_code=400, detail="Only pending orders can submit payment proof")
    
    updates = {"updated_at": datetime.now(timezone.utc)}
    if payload.payment_proof_url:
        updates["payment_proof_url"] = payload.payment_proof_url
    if payload.binance_transaction_id:
        updates["binance_transaction_id"] = payload.binance_transaction_id
    if payload.payment_notes:
        updates["payment_notes"] = payload.payment_notes
    if payload.customer_phone:
        updates["customer_phone"] = payload.customer_phone
    
    await db.orders.update_one({"id": payload.order_id}, {"$set": updates})
    updated_order = await db.orders.find_one({"id": payload.order_id})
    updated_order.pop("_id", None)
    return updated_order


@router.post("/binance/create-order")
async def create_binance_order(
    payload: CheckoutCreate,
    user=Depends(get_current_user),
):
    if not binance_service.is_enabled():
        raise HTTPException(status_code=400, detail="Binance Pay not enabled")
    
    db = get_db()
    order, products = await _build_order(user, payload.product_ids)
    
    product_name = ", ".join(p["name"] for p in products)
    binance_result = binance_service.create_order(
        order_id=order.id,
        user_email=user["email"],
        amount=order.total,
        currency="USDT",
        product_name=product_name[:128],
    )
    
    order.payment_provider = "binance"
    order.stripe_session_id = binance_result.get("prepayId")
    await db.orders.insert_one(order.model_dump())
    
    return {
        "mode": "binance",
        "order_id": order.id,
        "checkout_url": binance_result.get("checkoutUrl"),
    }


@router.post("/binance/webhook")
async def binance_webhook(request: Request):
    payload = await request.body()
    event = binance_service.verify_webhook(payload, request.headers)
    if not event:
        raise HTTPException(status_code=400, detail="Invalid webhook")
    
    db = get_db()
    biz_type = event.get("bizType")
    biz_status = event.get("bizStatus")
    
    if biz_type == "PAY" and biz_status == "SUCCESS":
        data = event.get("data", {})
        merchant_trade_no = data.get("merchantTradeNo")
        
        order = await db.orders.find_one({"id": merchant_trade_no})
        if order and order["status"] != "paid":
            products = []
            for item in order["items"]:
                p = await db.products.find_one({"id": item["product_id"]})
                if p:
                    products.append(p)
            order_obj = Order(**{k: v for k, v in order.items() if k != "_id"})
            license_ids = await _grant_licenses(order_obj, products)
            await db.orders.update_one(
                {"id": order["id"]},
                {
                    "$set": {
                        "status": "paid",
                        "license_ids": license_ids,
                        "stripe_payment_intent": data.get("transactionId"),
                        "updated_at": datetime.now(timezone.utc),
                    }
                }
            )
            order_obj.license_ids = license_ids
            await _send_purchase_email(order_obj, products, license_ids)
    
    return {"received": True}


@router.get("/binance/order/{order_id}")
async def get_binance_order(
    order_id: str,
    user=Depends(get_current_user),
):
    db = get_db()
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your order")
    
    order.pop("_id", None)
    return {"order": order}


@router.post("/admin/orders/{order_id}/activate", dependencies=[Depends(get_current_admin)])
async def admin_activate_order(
    order_id: str,
):
    db = get_db()
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    products = []
    for item in order["items"]:
        p = await db.products.find_one({"id": item["product_id"]})
        if p:
            products.append(p)
    
    order_obj = Order(**{k: v for k, v in order.items() if k != "_id"})
    license_ids = await _grant_licenses(order_obj, products)
    
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
        subscription_duration = 30
    
    expires_at = datetime.now(timezone.utc) + timedelta(days=int(subscription_duration))
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "active",
                "license_ids": license_ids,
                "activated_at": datetime.now(timezone.utc),
                "subscription_expires_at": expires_at,
                "updated_at": datetime.now(timezone.utc),
            }
        }
    )
    
    order_obj.license_ids = license_ids
    order_obj.status = "active"
    order_obj.activated_at = datetime.now(timezone.utc)
    order_obj.subscription_expires_at = expires_at
    
    await _send_purchase_email(order_obj, products, license_ids)
    
    updated_order = await db.orders.find_one({"id": order_id})
    updated_order.pop("_id", None)
    return updated_order


@router.post("/admin/orders/{order_id}/reject", dependencies=[Depends(get_current_admin)])
async def admin_reject_order(
    order_id: str,
):
    db = get_db()
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "rejected",
                "updated_at": datetime.now(timezone.utc),
            }
        }
    )
    
    updated_order = await db.orders.find_one({"id": order_id})
    updated_order.pop("_id", None)
    return updated_order
