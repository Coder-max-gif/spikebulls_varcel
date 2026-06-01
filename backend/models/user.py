import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


UserRole = Literal["user", "admin"]


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(UserBase):
    id: str
    role: UserRole
    email_verified: bool
    two_factor_enabled: bool
    created_at: datetime


class UserInDB(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    password_hash: str | None = None
    role: UserRole = "user"
    is_active: bool = True
    email_verified: bool = False
    verify_token: str | None = None
    reset_token: str | None = None
    reset_token_expires: datetime | None = None
    two_factor_enabled: bool = False
    two_factor_secret: str | None = None
    google_id: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic


class PasswordReset(BaseModel):
    token: str
    password: str = Field(min_length=8)


class EmailRequest(BaseModel):
    email: EmailStr


class UpdateProfile(BaseModel):
    name: str | None = None
    password: str | None = Field(default=None, min_length=8)
