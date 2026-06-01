from datetime import datetime, timezone
from fastapi import APIRouter, Depends

from core.database import get_db
from core.deps import get_current_user

router = APIRouter(prefix="/me", tags=["user"])


def _clean(d):
    d.pop("_id", None)
    return d


@router.get("/orders")
async def my_orders(user=Depends(get_current_user)):
    db = get_db()
    now = datetime.now(timezone.utc)
    docs = await db.orders.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    
    processed_orders = []
    for order in docs:
        order.pop("_id", None)
        processed_order = order.copy()
        
        if processed_order.get("status") == "active" and processed_order.get("subscription_expires_at"):
            expires_at = processed_order["subscription_expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            # Make sure expires_at has timezone info (UTC)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < now:
                processed_order["status"] = "expired"
        
        processed_orders.append(processed_order)
    
    return processed_orders


@router.get("/licenses")
async def my_licenses(user=Depends(get_current_user)):
    db = get_db()
    docs = await db.licenses.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    return [_clean(d) for d in docs]


@router.get("/summary")
async def my_summary(user=Depends(get_current_user)):
    db = get_db()
    orders = await db.orders.count_documents({"user_id": user["id"], "status": "paid"})
    licenses = await db.licenses.count_documents({"user_id": user["id"], "status": "active"})
    last_order = await db.orders.find_one({"user_id": user["id"]}, sort=[("created_at", -1)])
    if last_order:
        last_order.pop("_id", None)
    return {
        "orders": orders,
        "active_licenses": licenses,
        "last_order": last_order,
    }
