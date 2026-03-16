from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TastePreference(str, Enum):
    SPICY = "spicy"
    SWEET = "sweet"
    SOUR = "sour"
    SALTY = "salty"
    UMAMI = "umami"
    MILD = "mild"
    BITTER = "bitter"

class DietType(str, Enum):
    BALANCED = "balanced"
    MEAT_LOVER = "meat_lover"
    VEGETABLE_LOVER = "vegetable_lover"
    FITNESS_MEAL = "fitness_meal"

class CookingTime(str, Enum):
    QUICK = "quick"  # < 15 mins
    MEDIUM = "medium"  # 15-30 mins
    LONG = "long"  # > 30 mins

class RecipeDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class RecipeBase(BaseModel):
    title: str
    description: Optional[str] = None
    ingredients: List[str]
    steps: List[str]
    cooking_time: int  # in minutes
    difficulty: RecipeDifficulty
    taste_tags: List[TastePreference] = []
    diet_types: List[DietType] = []
    calories: Optional[int] = None
    servings: int = 1
    image_url: Optional[str] = None

class RecipeCreate(RecipeBase):
    pass

class RecipeInDB(RecipeBase):
    id: str
    user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class RecipeResponse(RecipeBase):
    id: str
    user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    matched_ingredients: List[str] = []
    missing_ingredients: List[str] = []
    match_percentage: float = 0.0

class RecipeRecommendationRequest(BaseModel):
    available_ingredients: List[str]
    taste_preferences: List[TastePreference] = []
    diet_type: Optional[DietType] = None
    max_cooking_time: Optional[int] = None
    max_difficulty: Optional[RecipeDifficulty] = None
