from fastapi import APIRouter, HTTPException
from typing import List, Optional
from models.database import get_supabase_client
from models.recipe_schemas import (
    RecipeCreate, RecipeResponse, RecipeRecommendationRequest,
    TastePreference, DietType, RecipeDifficulty
)
from services.recipe_service import recommend_recipes

router = APIRouter()
supabase = get_supabase_client()

@router.post("/recommend", response_model=List[RecipeResponse])
async def get_recipe_recommendations(request: RecipeRecommendationRequest):
    try:
        recommendations = await recommend_recipes(
            available_ingredients=request.available_ingredients,
            taste_preferences=request.taste_preferences,
            diet_type=request.diet_type,
            max_cooking_time=request.max_cooking_time,
            max_difficulty=request.max_difficulty
        )
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(recipe_id: str):
    try:
        result = supabase.table("recipes").select("*").eq("id", recipe_id).execute()
        
        if result.data:
            return RecipeResponse(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="Recipe not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[RecipeResponse])
async def get_recipes(
    category: Optional[str] = None,
    diet_type: Optional[DietType] = None,
    difficulty: Optional[RecipeDifficulty] = None,
    limit: int = 20,
    offset: int = 0
):
    try:
        query = supabase.table("recipes").select("*")
        
        if category:
            query = query.like("title", f"%{category}%")
        if diet_type:
            query = query.contains("diet_types", [diet_type.value])
        if difficulty:
            query = query.eq("difficulty", difficulty.value)
        
        result = query.range(offset, offset + limit - 1).execute()
        
        if result.data:
            return [RecipeResponse(**item) for item in result.data]
        
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=RecipeResponse)
async def create_recipe(recipe: RecipeCreate, user_id: Optional[str] = None):
    try:
        data = recipe.model_dump()
        if user_id:
            data["user_id"] = user_id
        
        result = supabase.table("recipes").insert(data).execute()
        
        if result.data:
            return RecipeResponse(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Failed to create recipe")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
