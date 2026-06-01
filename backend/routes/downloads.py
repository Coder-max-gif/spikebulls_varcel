import logging
import os
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError

from core.config import settings
from core.database import get_db
from core.deps import get_current_user
from core.security import create_download_token, decode_download_token
from models.product import Product
from models.order import Order
from models.download import DownloadLog, DownloadLogCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/downloads", tags=["downloads"])

STORAGE_DIR = Path(__file__).parent.parent / "storage"
PRODUCTS_DIR = STORAGE_DIR / "products"
LICENSES_DIR = STORAGE_DIR / "licenses"


@router.get("/token/{product_id}")
async def request_download_token(
    product_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    db=Depends(get_db),
):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if product["delivery_type"] != "download" or not product.get("file_path"):
        raise HTTPException(status_code=400, detail="Product is not downloadable")
    
    # Check if user has a paid order
    order = await db.orders.find_one({
        "user_id": current_user["id"],
        "status": {"$in": ["paid", "active"]},
        "items.product_id": product_id,
    })
    
    # If no order, check if user has active license
    license = None
    if not order:
        license = await db.licenses.find_one({
            "user_id": current_user["id"],
            "product_id": product_id,
            "status": "active",
        })
        if not license:
            raise HTTPException(status_code=403, detail="You do not own this product")
    
    download_count = await db.download_logs.count_documents({
        "user_id": current_user["id"],
        "product_id": product_id,
    })
    max_downloads = product.get("max_downloads", 5)
    if download_count >= max_downloads:
        raise HTTPException(status_code=429, detail=f"Download limit exceeded (max {max_downloads})")
    
    token = create_download_token(
        user_id=current_user["id"],
        product_id=product_id,
        order_id=order["id"] if order else None,
    )
    return {"download_token": token, "download_url": f"/api/downloads/{token}"}


@router.get("/license/{license_id}/token")
async def request_license_download_token(
    license_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    db=Depends(get_db),
):
    license = await db.licenses.find_one({"id": license_id})
    if not license:
        raise HTTPException(status_code=404, detail="License not found")
    if license["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You don't own this license")
    if not license.get("file_path"):
        raise HTTPException(status_code=400, detail="No file attached to this license")
    
    token = create_download_token(
        user_id=current_user["id"],
        license_id=license_id,
    )
    return {"download_token": token, "download_url": f"/api/downloads/license/{token}"}


@router.get("/license/{token}")
async def download_license_file(
    token: str,
    request: Request,
    db = Depends(get_db),
):
    try:
        payload = decode_download_token(token)
    except ExpiredSignatureError:
        raise HTTPException(status_code=403, detail="Download token expired")
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid download token")
    
    user_id = payload["sub"]
    license_id = payload.get("license_id")
    
    license = await db.licenses.find_one({"id": license_id})
    if not license or not license.get("file_path"):
        raise HTTPException(status_code=404, detail="License or file not found")
    
    file_path = LICENSES_DIR / license["file_path"]
    if not file_path.exists() or not file_path.is_file():
        logger.error(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found")
    
    download_log = DownloadLogCreate(
        user_id=user_id,
        product_id=license["product_id"],
        license_id=license_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    await db.download_logs.insert_one(DownloadLog(**download_log.model_dump()).model_dump())
    
    filename = file_path.name
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream",
    )


@router.get("/{token}")
async def download_file(
    token: str,
    request: Request,
    db=Depends(get_db),
):
    try:
        payload = decode_download_token(token)
    except ExpiredSignatureError:
        raise HTTPException(status_code=403, detail="Download token expired")
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid download token")
    
    user_id = payload["sub"]
    product_id = payload["product_id"]
    order_id = payload.get("order_id")
    
    product = await db.products.find_one({"id": product_id})
    if not product or not product.get("file_path"):
        raise HTTPException(status_code=404, detail="Product or file not found")
    
    file_path = PRODUCTS_DIR / product["file_path"]
    if not file_path.exists() or not file_path.is_file():
        logger.error(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found")
    
    download_log = DownloadLogCreate(
        user_id=user_id,
        product_id=product_id,
        order_id=order_id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    await db.download_logs.insert_one(DownloadLog(**download_log.model_dump()).model_dump())
    
    filename = file_path.name
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream",
    )


@router.get("/me")
async def get_my_downloads(
    current_user: Annotated[dict, Depends(get_current_user)],
    db = Depends(get_db),
):
    orders_cursor = db.orders.find({
        "user_id": current_user["id"],
        "status": {"$in": ["paid", "active"]},
    })
    orders = [order async for order in orders_cursor]
    
    licenses_cursor = db.licenses.find({
        "user_id": current_user["id"],
        "status": "active",
    })
    licenses = [lic async for lic in licenses_cursor]
    
    all_product_ids = []
    for order in orders:
        for item in order.get("items", []):
            all_product_ids.append(item["product_id"])
    for lic in licenses:
        all_product_ids.append(lic["product_id"])
    
    product_ids = list(set(all_product_ids))
    
    products_cursor = db.products.find({
        "id": {"$in": product_ids},
    })
    products = [prod async for prod in products_cursor]
    products_by_id = {p["id"]: p for p in products}
    
    result = []
    processed_product_ids = set()
    
    # First, add products from orders with product-level file
    for order in orders:
        for item in order.get("items", []):
            product_id = item["product_id"]
            product = products_by_id.get(product_id)
            if product and product.get("file_path") and product.get("delivery_type") == "download":
                if product_id in processed_product_ids:
                    continue
                processed_product_ids.add(product_id)
                
                download_count = await db.download_logs.count_documents({
                    "user_id": current_user["id"],
                    "product_id": product["id"],
                })
                
                result.append({
                    "type": "product",
                    "product": product,
                    "order": order,
                    "download_count": download_count,
                    "max_downloads": product.get("max_downloads", 5),
                })
    
    # Now add license-specific downloads
    for lic in licenses:
        if lic.get("file_path"):
            product = products_by_id.get(lic["product_id"])
            
            download_count = await db.download_logs.count_documents({
                "user_id": current_user["id"],
                "license_id": lic["id"],
            })
            
            result.append({
                "type": "license",
                "product": product,
                "license": lic,
                "download_count": download_count,
                "max_downloads": product.get("max_downloads", 5) if product else 5,
            })
        elif products_by_id.get(lic["product_id"], {}).get("file_path") and products_by_id.get(lic["product_id"], {}).get("delivery_type") == "download":
            product_id = lic["product_id"]
            if product_id in processed_product_ids:
                continue
            processed_product_ids.add(product_id)
            
            product = products_by_id.get(product_id)
            download_count = await db.download_logs.count_documents({
                "user_id": current_user["id"],
                "product_id": product["id"],
            })
            
            result.append({
                "type": "product",
                "product": product,
                "license": lic,
                "download_count": download_count,
                "max_downloads": product.get("max_downloads", 5),
            })
    
    return result
