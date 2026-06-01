from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from core.config import settings
from core.database import get_db
from core.deps import get_current_user, get_current_admin
from core.email import send_email, wrap_email
from models.license import License
from models.order import CheckoutCreate, Order, OrderItem, ManualPaymentSubmit
from services import stripe_service
from services.seed import generate_license_key

router = APIRouter(prefix="/checkout", tags=["checkout"])
orders_router = APIRouter(prefix="/orders", tags=["orders"], dependencies=[Depends(get_current_user)])


async def _build_order(user: dict, payload: CheckoutCreate) -> tuple[Order, list[dict]]:
    db = get_db()
    items: list[OrderItem] = []
    products: list[dict] = []
    for pid in payload.product_ids:
        prod = await db.products.find_one({"id": pid, "status": "active"})
        if not prod:
            raise HTTPException(status_code=400, detail=f"Invalid product: {pid}")
        items.append(OrderItem(product_id=prod["id"], name=prod["name"], price=prod["price"]))
        products.append(prod)
    subtotal = sum(i.price * i.quantity for i in items)
    order = Order(
        user_id=user["id"],
        user_email=user["email"],
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_address=payload.customer_address,
        mt5_account_number=payload.mt5_account_number,
        subscription_duration=payload.subscription_duration,
        items=items,
        subtotal=subtotal,
        total=subtotal,
    )
    return order, products


async def _grant_licenses(order: Order, products: list[dict]) -> list[str]:
    db = get_db()
    license_ids: list[str] = []
    for prod in products:
        duration = prod.get("license_duration_days")
        expires_at = None
        if duration:
            expires_at = datetime.now(timezone.utc) + timedelta(days=int(duration))
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


@router.post("")
async def create_checkout(payload: CheckoutCreate, user=Depends(get_current_user)):
    db = get_db()
    order, products = await _build_order(user, payload)

    if stripe_service.is_enabled():
        line_items = [
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": item.name},
                    "unit_amount": int(round(item.price * 100)),
                },
                "quantity": item.quantity,
            }
            for item in order.items
        ]
        session = stripe_service.create_checkout_session(
            order_id=order.id,
            user_email=user["email"],
            line_items=line_items,
        )
        order.stripe_session_id = session["id"]
        await db.orders.insert_one(order.model_dump())
        return {
            "mode": "stripe",
            "order_id": order.id,
            "checkout_url": session["url"],
        }

    # --- Manual Binance Payment Checkout ---
    order.payment_provider = "binance"
    order.status = "pending"
    order.updated_at = datetime.now(timezone.utc)
    await db.orders.insert_one(order.model_dump())
    return {
        "mode": "binance",
        "order_id": order.id,
        "checkout_url": f"{settings.APP_URL}/checkout/success?order_id={order.id}",
        "payment_instructions": settings.BINANCE_PAYMENT_INSTRUCTIONS,
        "binance_address": settings.BINANCE_PAY_ADDRESS,
        "binance_qr_text": settings.BINANCE_QR_TEXT,
        "binance_qr_image_url": settings.BINANCE_QR_IMAGE_URL,
        "binance_email": settings.BINANCE_PAY_EMAIL,
    }


@router.get("/orders/{order_id}")
async def get_order(order_id: str, user=Depends(get_current_user)):
    db = get_db()
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your order")
    licenses = await db.licenses.find({"order_id": order_id}).to_list(50)
    order.pop("_id", None)
    for lic in licenses:
        lic.pop("_id", None)
    return {
        "order": order, 
        "licenses": licenses,
        "payment_info": {
            "binance_address": settings.BINANCE_PAY_ADDRESS,
            "binance_qr_text": settings.BINANCE_QR_TEXT,
            "binance_qr_image_url": settings.BINANCE_QR_IMAGE_URL,
            "payment_instructions": settings.BINANCE_PAYMENT_INSTRUCTIONS
        }
    }


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    event = stripe_service.verify_webhook(payload, sig)
    if not event:
        raise HTTPException(status_code=400, detail="Invalid webhook")
    event_type = event.get("type")
    data = event.get("data", {}).get("object", {})

    db = get_db()
    if event_type == "checkout.session.completed":
        session_id = data.get("id")
        order = await db.orders.find_one({"stripe_session_id": session_id})
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
                        "stripe_payment_intent": data.get("payment_intent"),
                        "updated_at": datetime.now(timezone.utc),
                    }
                },
            )
            order_obj.license_ids = license_ids
            await _send_purchase_email(order_obj, products, license_ids)
    return {"received": True}


# ---- User Orders with Expiry Tracking ----
@orders_router.get("")
async def get_user_orders(user=Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    orders = await db.orders.find({"user_id": user["id"]}).sort("created_at", -1).to_list(500)
    
    processed_orders = []
    for order in orders:
        order.pop("_id", None)
        processed_order = order.copy()
        
        if processed_order.get("status") == "active" and processed_order.get("subscription_expires_at"):
            expires_at = processed_order["subscription_expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if expires_at < now:
                processed_order["status"] = "expired"
        
        processed_orders.append(processed_order)
    
    return processed_orders


@orders_router.get("/{order_id}")
async def get_user_order_detail(order_id: str, user=Depends(get_current_user)):
    db = get_db()
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not your order")
    
    order.pop("_id", None)
    processed_order = order.copy()
    
    if processed_order.get("status") == "active" and processed_order.get("subscription_expires_at"):
        now = datetime.now(timezone.utc)
        expires_at = processed_order["subscription_expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if expires_at < now:
            processed_order["status"] = "expired"
    
    licenses = await db.licenses.find({"order_id": order_id}).to_list(50)
    for lic in licenses:
        lic.pop("_id", None)
    
    return {"order": processed_order, "licenses": licenses}


@router.post("/manual-payment")
async def submit_manual_payment(payload: ManualPaymentSubmit, user=Depends(get_current_user)):
    db = get_db()
    order = await db.orders.find_one({"id": payload.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")
    if order["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can submit payment proof")
    
    updates = {"updated_at": datetime.now(timezone.utc)}
    if payload.payment_proof_url:
        updates["payment_proof_url"] = payload.payment_proof_url
    if payload.binance_transaction_id:
        updates["binance_transaction_id"] = payload.binance_transaction_id
    if payload.payment_notes:
        updates["payment_notes"] = payload.payment_notes
    
    await db.orders.update_one({"id": payload.order_id}, {"$set": updates})
    updated_order = await db.orders.find_one({"id": payload.order_id})
    updated_order.pop("_id", None)
    return updated_order
