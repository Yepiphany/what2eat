from pydantic import BaseModel, Field
from typing import Optional, List, Literal
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
    taste_preferences: List[TastePreference] = Field(default_factory=list)
    diet_type: Optional[DietType] = None
    max_cooking_time: Optional[int] = None
    cooking_level: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class FavoriteRecipeMemoryItem(BaseModel):
    id: str
    title: str
    cooking_time: int
    difficulty: str
    image_url: Optional[str] = None
    saved_at: str


class CookingHistoryMemoryItem(BaseModel):
    session_id: str
    recipe_id: str
    recipe_title: str
    completed_at: str
    elapsed_seconds: int


class UserMemoryProfileBase(BaseModel):
    favorite_recipes: List[FavoriteRecipeMemoryItem] = Field(default_factory=list)
    history_records: List[CookingHistoryMemoryItem] = Field(default_factory=list)
    temporary_goals: List[str] = Field(default_factory=list)
    long_term_goals: List[str] = Field(default_factory=list)
    ai_context_notes: List[str] = Field(default_factory=list)


class UserMemoryProfileResponse(UserMemoryProfileBase):
    user_id: str
    created_at: datetime
    updated_at: datetime


class UserMemoryProfileUpdate(BaseModel):
    favorite_recipes: Optional[List[FavoriteRecipeMemoryItem]] = None
    history_records: Optional[List[CookingHistoryMemoryItem]] = None
    temporary_goals: Optional[List[str]] = None
    long_term_goals: Optional[List[str]] = None
    ai_context_notes: Optional[List[str]] = None


class MemoryGoalsUpdateRequest(BaseModel):
    goal: str
    goal_type: Literal["temporary", "long_term"] = "temporary"
    action: Literal["add", "remove"] = "add"


class MemoryFavoritesSyncRequest(BaseModel):
    favorite_recipes: List[FavoriteRecipeMemoryItem] = Field(default_factory=list)


class MemoryHistorySyncRequest(BaseModel):
    history_records: List[CookingHistoryMemoryItem] = Field(default_factory=list)
