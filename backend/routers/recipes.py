from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from pydantic import BaseModel
from services.recipe_service import enhance_recipe_with_matching, generate_recipe_id, get_recipe_from_database

router = APIRouter()

@router.post("/recommend")
async def get_recipe_recommendations(request: Request):
    from models.recipe_schemas import TastePreference, DietType
    
    data = await request.json()
    available_ingredients = data.get('available_ingredients', [])
    taste_preferences = data.get('taste_preferences', [])
    diet_type = data.get('diet_type', None)
    force_refresh = data.get('force_refresh', False)
    
    if not available_ingredients:
        return []
    
    from services.recipe_service import get_ai_batch_recipes
    
    recipes = await get_ai_batch_recipes(
        available_ingredients=available_ingredients,
        taste_preferences=taste_preferences,
        diet_type=diet_type,
        count=10,
        force_refresh=force_refresh
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
    recipe = get_recipe_from_database(recipe_id)
    
    if recipe:
        return recipe
    
    raise HTTPException(status_code=404, detail="菜谱不存在")

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
