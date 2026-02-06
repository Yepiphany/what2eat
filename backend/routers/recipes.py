from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from pydantic import BaseModel
from services.recipe_service import enhance_recipe_with_matching, generate_recipe_id

router = APIRouter()

@router.post("/recommend")
async def get_recipe_recommendations(request: Request):
    from models.recipe_schemas import TastePreference, DietType
    
    data = await request.json()
    available_ingredients = data.get('available_ingredients', [])
    taste_preferences = data.get('taste_preferences', [])
    diet_type = data.get('diet_type', None)
    
    if not available_ingredients:
        return []
    
    from services.recipe_service import get_ai_batch_recipes
    
    recipes = await get_ai_batch_recipes(
        available_ingredients=available_ingredients,
        taste_preferences=taste_preferences,
        diet_type=diet_type,
        count=10
    )
    return recipes

@router.post("/batch")
async def get_batch_recipes(request: Request):
    from models.recipe_schemas import TastePreference, DietType
    
    data = await request.json()
    available_ingredients = data.get('available_ingredients', [])
    taste_preferences = data.get('taste_preferences', [])
    diet_type = data.get('diet_type', None)
    
    from services.recipe_service import get_ai_batch_recipes
    
    recipes = await get_ai_batch_recipes(
        available_ingredients=available_ingredients,
        taste_preferences=taste_preferences,
        diet_type=diet_type,
        count=10
    )
    return {"recipes": recipes, "total": len(recipes)}

@router.get("/{recipe_id}")
async def get_recipe(recipe_id: str):
    return {
        "id": recipe_id,
        "title": "示例菜谱",
        "description": "菜谱详情",
        "ingredients": ["食材1", "食材2"],
        "steps": ["步骤1", "步骤2"],
        "cooking_time": 30,
        "difficulty": "easy",
        "taste_tags": ["mild"],
        "diet_types": ["normal"],
        "calories": 300,
        "servings": 2,
        "matched_ingredients": [],
        "missing_ingredients": [],
        "match_percentage": 0,
        "image_url": None
    }

@router.get("/")
async def get_recipes():
    return []

@router.post("/")
async def create_recipe(request):
    return {
        "id": "new_recipe_1",
        **(request.model_dump() if hasattr(request, 'model_dump') else dict(request)),
        "matched_ingredients": [],
        "missing_ingredients": [],
        "match_percentage": 0,
        "image_url": None
    }
