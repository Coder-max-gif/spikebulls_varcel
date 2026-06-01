import logging
import secrets
import io
import base64
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import pyotp
import qrcode
import requests
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

from core.config import settings
from core.database import get_db
from core.deps import get_current_user
from core.email import send_email, wrap_email
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from models.user import (
    EmailRequest,
    PasswordReset,
    TokenPair,
    UpdateProfile,
    UserCreate,
    UserInDB,
    UserLogin,
    UserPublic,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_public(user: dict) -> UserPublic:
    return UserPublic(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user.get("role", "user"),
        email_verified=user.get("email_verified", False),
        two_factor_enabled=user.get("two_factor_enabled", False),
        created_at=user["created_at"],
    )


def _build_token_pair(user: dict) -> TokenPair:
    public = _to_public(user)
    access = create_access_token(user["id"], extra={"role": user.get("role", "user")})
    refresh = create_refresh_token(user["id"])
    return TokenPair(access_token=access, refresh_token=refresh, user=public)


@router.post("/register", response_model=TokenPair)
async def register(payload: UserCreate):
    db = get_db()
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    verify_token = secrets.token_urlsafe(32)
    user = UserInDB(
        email=payload.email.lower(),
        name=payload.name.strip(),
        password_hash=hash_password(payload.password),
        verify_token=verify_token,
    )
    await db.users.insert_one(user.model_dump())

    # Send welcome / verification email (non-blocking on failure)
    verify_url = f"{settings.APP_URL}/verify-email?token={verify_token}"
    body = (
        f"<p>Hi {user.name},</p>"
        f"<p>Welcome to SpikeBulls. Confirm your email address to unlock your account.</p>"
    )
    try:
        await send_email(
            to=user.email,
            subject="Welcome to SpikeBulls",
            html=wrap_email("Welcome aboard", body, "Verify email", verify_url),
            meta={"type": "welcome"},
        )
    except Exception as e:
        logger.warning(f"Failed to send welcome email: {e}")
        pass

    stored = await db.users.find_one({"id": user.id})
    return _build_token_pair(stored)


@router.post("/login", response_model=TokenPair)
async def login(payload: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account disabled")
    return _build_token_pair(user)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest):
    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    db = get_db()
    user = await db.users.find_one({"id": data["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return _build_token_pair(user)


@router.get("/me", response_model=UserPublic)
async def me(user=Depends(get_current_user)):
    return _to_public(user)


@router.patch("/me", response_model=UserPublic)
async def update_me(payload: UpdateProfile, user=Depends(get_current_user)):
    db = get_db()
    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.password:
        updates["password_hash"] = hash_password(payload.password)
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    refreshed = await db.users.find_one({"id": user["id"]})
    return _to_public(refreshed)


@router.post("/forgot-password")
async def forgot_password(payload: EmailRequest):
    db = get_db()
    user = await db.users.find_one({"email": payload.email.lower()})
    # Always return success to prevent user enumeration
    if user:
        token = secrets.token_urlsafe(40)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"reset_token": token, "reset_token_expires": expires}},
        )
        reset_url = f"{settings.APP_URL}/reset-password?token={token}"
        body = (
            f"<p>Hi {user['name']},</p>"
            "<p>We received a request to reset your SpikeBulls password. The link below expires in 1 hour.</p>"
            "<p>If you didn't request this, you can safely ignore this email.</p>"
        )
        try:
            await send_email(
                to=user["email"],
                subject="Reset your SpikeBulls password",
                html=wrap_email("Password reset", body, "Reset password", reset_url),
                meta={"type": "password_reset"},
            )
        except Exception as e:
            logger.warning(f"Failed to send password reset email: {e}")
            pass
    return {"ok": True, "message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(payload: PasswordReset):
    db = get_db()
    user = await db.users.find_one({"reset_token": payload.token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    expires = user.get("reset_token_expires")
    if expires and expires.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired")
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "password_hash": hash_password(payload.password),
                "reset_token": None,
                "reset_token_expires": None,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return {"ok": True, "message": "Password updated. You can now log in."}


class VerifyEmailRequest(BaseModel):
    token: str


@router.post("/verify-email")
async def verify_email(payload: VerifyEmailRequest):
    db = get_db()
    user = await db.users.find_one({"verify_token": payload.token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"email_verified": True, "verify_token": None}},
    )
    return {"ok": True, "message": "Email verified."}


class TwoFASetupResponse(BaseModel):
    secret: str
    qr_code: str


@router.post("/2fa/setup", response_model=TwoFASetupResponse)
async def setup_2fa(user=Depends(get_current_user)):
    db = get_db()
    if user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA already enabled")

    secret = pyotp.random_base32()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"two_factor_secret": secret, "updated_at": datetime.now(timezone.utc)}},
    )

    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user["email"], issuer_name="SpikeBulls")
    img = qrcode.make(uri)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return TwoFASetupResponse(secret=secret, qr_code=qr_code_base64)


class TwoFAVerifyRequest(BaseModel):
    code: str


@router.post("/2fa/verify", response_model=UserPublic)
async def verify_2fa(payload: TwoFAVerifyRequest, user=Depends(get_current_user)):
    db = get_db()
    secret = user.get("two_factor_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="2FA not set up")

    totp = pyotp.TOTP(secret)
    if not totp.verify(payload.code):
        raise HTTPException(status_code=401, detail="Invalid 2FA code")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"two_factor_enabled": True, "updated_at": datetime.now(timezone.utc)}},
    )

    updated = await db.users.find_one({"id": user["id"]})
    return _to_public(updated)


class TwoFADisableRequest(BaseModel):
    password: str


@router.post("/2fa/disable")
async def disable_2fa(payload: TwoFADisableRequest, user=Depends(get_current_user)):
    db = get_db()
    if not user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA not enabled")

    # Check password only if user has a password (not a Google-only user)
    if user.get("password_hash"):
        if not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid password")
    # If no password (Google user), no password check needed

    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "two_factor_enabled": False,
                "two_factor_secret": None,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"ok": True, "message": "2FA disabled"}


class LoginWith2FARequest(BaseModel):
    email: EmailStr
    password: str
    two_factor_code: str | None = None


@router.post("/login-with-2fa", response_model=TokenPair)
async def login_with_2fa(payload: LoginWith2FARequest):
    db = get_db()
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account disabled")

    if user.get("two_factor_enabled"):
        if not payload.two_factor_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="2FA code required",
                headers={"WWW-Authenticate": "TwoFactor"},
            )
        secret = user.get("two_factor_secret")
        totp = pyotp.TOTP(secret)
        if not totp.verify(payload.two_factor_code):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")

    return _build_token_pair(user)


# Google OAuth
@router.get("/google/url")
async def google_login_url():
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google OAuth not configured")
    
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"auth_url": auth_url}


@router.get("/google/callback", response_class=HTMLResponse)
async def google_callback(request: Request, code: str = None, error: str = None):
    if error:
        html_content = f"""
        <html>
            <body>
                <script>
                    window.opener.postMessage({{ error: "{error}" }}, "*");
                    window.close();
                </script>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Google OAuth not configured")
    
    # Exchange code for tokens
    token_data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
    }
    token_response = requests.post(
        "https://oauth2.googleapis.com/token", data=token_data
    )
    token_json = token_response.json()
    if token_response.status_code != 200:
        logger.error(f"Google token exchange failed: {token_json}")
        html_content = """
        <html>
            <body>
                <script>
                    window.opener.postMessage({ error: "Failed to exchange code for tokens" }, "*");
                    window.close();
                </script>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    # Get user info from Google
    access_token = token_json["access_token"]
    userinfo_response = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    userinfo = userinfo_response.json()
    if userinfo_response.status_code != 200:
        logger.error(f"Failed to get Google user info: {userinfo}")
        html_content = """
        <html>
            <body>
                <script>
                    window.opener.postMessage({ error: "Failed to get user info from Google" }, "*");
                    window.close();
                </script>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    google_id = userinfo["sub"]
    email = userinfo["email"].lower()
    name = userinfo.get("name", email.split("@")[0])
    email_verified = userinfo.get("email_verified", False)
    
    db = get_db()
    
    # Check if user exists with google_id or email
    user = await db.users.find_one({"google_id": google_id})
    if not user:
        user = await db.users.find_one({"email": email})
        if user:
            # Link existing account with Google
            await db.users.update_one(
                {"email": email},
                {"$set": {"google_id": google_id, "email_verified": email_verified, "updated_at": datetime.now(timezone.utc)}},
            )
            user = await db.users.find_one({"email": email})
        else:
            # Create new user with Google
            new_user = UserInDB(
                email=email,
                name=name,
                google_id=google_id,
                email_verified=email_verified,
            )
            await db.users.insert_one(new_user.model_dump())
            user = await db.users.find_one({"id": new_user.id})
            
            # Send welcome email for Google users
            welcome_body = (
                f"<p>Hi {name},</p>"
                f"<p>Welcome to SpikeBulls! You've successfully signed up with Google.</p>"
                f"<p>Your account is ready to use.</p>"
            )
            try:
                await send_email(
                    to=email,
                    subject="Welcome to SpikeBulls",
                    html=wrap_email("Welcome aboard", welcome_body, "Go to dashboard", f"{settings.APP_URL}/dashboard"),
                    meta={"type": "welcome_google"},
                )
            except Exception as e:
                logger.warning(f"Failed to send welcome email to Google user: {e}")
                pass
    
    if not user.get("is_active", True):
        html_content = """
        <html>
            <body>
                <script>
                    window.opener.postMessage({ error: "Account disabled" }, "*");
                    window.close();
                </script>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    
    token_pair = _build_token_pair(user)
    
    # Send token pair back to opener
    html_content = f"""
    <html>
        <body>
            <script>
                window.opener.postMessage({{
                    access_token: "{token_pair.access_token}",
                    refresh_token: "{token_pair.refresh_token}",
                    user: {token_pair.user.model_dump_json()}
                }}, "*");
                window.close();
            </script>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)
