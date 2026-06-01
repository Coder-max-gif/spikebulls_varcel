from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from core.database import get_db
from core.deps import get_current_user, get_optional_user

router = APIRouter(prefix="/licenses", tags=["licenses"])


class ActivateLicenseRequest(BaseModel):
    license_key: str
    machine_id: str | None = None
    ip_address: str | None = None


class DeactivateLicenseRequest(BaseModel):
    license_key: str
    machine_id: str | None = None


def _clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.post("/activate")
async def activate_license(
    payload: ActivateLicenseRequest,
    request: Request,
    user: dict | None = Depends(get_optional_user),
):
    db = get_db()
    
    license = await db.licenses.find_one({"key": payload.license_key})
    if not license:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid license key"
        )
    
    if license["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"License is {license['status']}"
        )
    
    if license.get("expires_at"):
        expires_at = license["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            await db.licenses.update_one(
                {"id": license["id"]},
                {"$set": {"status": "expired", "updated_at": datetime.now(timezone.utc)}}
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="License has expired"
            )
    
    activations = license.get("activations", 0)
    max_activations = license.get("max_activations", 2)
    if activations >= max_activations:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Activation limit exceeded (max {max_activations})"
        )
    
    updates = {
        "activations": activations + 1,
        "updated_at": datetime.now(timezone.utc),
    }
    
    if not license.get("activated_at"):
        updates["activated_at"] = datetime.now(timezone.utc)
    
    if payload.machine_id:
        updates["last_machine_id"] = payload.machine_id
    
    client_ip = payload.ip_address or (request.client.host if request.client else None)
    if client_ip:
        updates["last_ip_address"] = client_ip
    
    await db.licenses.update_one(
        {"id": license["id"]},
        {"$set": updates}
    )
    
    updated = await db.licenses.find_one({"id": license["id"]})
    
    return {
        "ok": True,
        "license": _clean(updated),
        "remaining_activations": max_activations - (activations + 1),
    }


@router.post("/deactivate")
async def deactivate_license(
    payload: DeactivateLicenseRequest,
    user: dict | None = Depends(get_optional_user),
):
    db = get_db()
    
    license = await db.licenses.find_one({"key": payload.license_key})
    if not license:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid license key"
        )
    
    await db.licenses.update_one(
        {"id": license["id"]},
        {"$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"ok": True, "message": "License deactivation logged"}


@router.get("/{key}")
async def get_license_by_key(key: str, user: dict | None = Depends(get_optional_user)):
    db = get_db()
    
    license = await db.licenses.find_one({"key": key})
    if not license:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="License not found"
        )
    
    if user and user.get("id") != license["user_id"] and user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this license"
        )
    
    return _clean(license)
