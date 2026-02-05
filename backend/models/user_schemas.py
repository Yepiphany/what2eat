from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum
from models.recipe_schemas import TastePreference, DietType

class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    taste_preferences: Optional[List[TastePreference]] = None
    diet_type: Optional[DietType] = None
    max_cooking_time: Optional[int] = None
    cooking_level: Optional[str] = None

class UserInDB(UserBase):
    id: str
    taste_preferences: List[str] = []
    diet_type: Optional[str] = None
    max_cooking_time: Optional[int] = None
    cooking_level: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class UserResponse(UserBase):
    id: str
    taste_preferences: List[TastePreference] = []
    diet_type: Optional[DietType] = None
    max_cooking_time: Optional[int] = None
    cooking_level: Optional[str] = None
    created_at: datetime
    updated_at: datetime
