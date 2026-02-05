from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class IngredientCategory(str, Enum):
    VEGETABLE = "vegetable"
    MEAT = "meat"
    SEAFOOD = "seafood"
    DAIRY = "dairy"
    EGG = "egg"
    GRAIN = "grain"
    FRUIT = "fruit"
    SEASONING = "seasoning"
    BEVERAGE = "beverage"
    OTHER = "other"

class IngredientBase(BaseModel):
    name: str
    category: IngredientCategory
    quantity: float
    unit: str
    expiry_date: Optional[datetime] = None
    image_url: Optional[str] = None

class IngredientCreate(IngredientBase):
    pass

class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[IngredientCategory] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    expiry_date: Optional[datetime] = None
    image_url: Optional[str] = None

class IngredientInDB(IngredientBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class IngredientResponse(IngredientBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    days_until_expiry: Optional[int] = None
    is_expiring_soon: bool = False
