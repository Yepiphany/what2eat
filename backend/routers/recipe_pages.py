from typing import List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, HTTPException
import hashlib
import json

router = APIRouter()

def get_supabase_client():
    try:
        from models.database import get_supabase_client
        return get_supabase_client()
    except Exception:
        return None

def generate_recipe_id():
    from uuid import uuid4
    return str(uuid4())

def hash_ingredients(ingredients: List[str]) -> str:
    sorted_ingredients = sorted([ing.lower() for ing in ingredients])
    ingredients_str = ','.join(sorted_ingredients)
    return hashlib.md5(ingredients_str.encode()).hexdigest()

@router.get("/")
async def get_recipe_pages():
    try:
        supabase = get_supabase_client()
        if supabase is None:
            return {"pages": [], "current_page": 0}
        
        user_id = "00000000-0000-0000-0000-000000000000"
        
        result = supabase.table("recipe_pages").select("*").eq("user_id", user_id).order("page_index").execute()
        
        if result.data:
            pages = [page["recipes"] for page in result.data]
            return {"pages": pages, "current_page": len(pages) - 1}
        else:
            return {"pages": [], "current_page": 0}
    except Exception as e:
        print(f"Failed to get recipe pages: {e}")
        return {"pages": [], "current_page": 0}

@router.post("/")
async def save_recipe_page(page_data: Dict[str, Any]):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        user_id = "00000000-0000-0000-0000-000000000000"
        page_index = page_data.get("page_index", 0)
        recipes = page_data.get("recipes", [])
        ingredients = page_data.get("ingredients", [])
        ingredients_hash = hash_ingredients(ingredients)
        
        existing = supabase.table("recipe_pages").select("*").eq("user_id", user_id).eq("page_index", page_index).execute()
        
        if existing.data and len(existing.data) > 0:
            supabase.table("recipe_pages").update({
                "recipes": recipes,
                "ingredients_hash": ingredients_hash
            }).eq("id", existing.data[0]["id"]).execute()
            return {"message": "Recipe page updated", "page_index": page_index}
        else:
            supabase.table("recipe_pages").insert({
                "user_id": user_id,
                "page_index": page_index,
                "recipes": recipes,
                "ingredients_hash": ingredients_hash
            }).execute()
            return {"message": "Recipe page saved", "page_index": page_index}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Failed to save recipe page: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/")
async def clear_recipe_pages():
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        user_id = "00000000-0000-0000-0000-000000000000"
        
        supabase.table("recipe_pages").delete().eq("user_id", user_id).execute()
        
        return {"message": "Recipe pages cleared"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Failed to clear recipe pages: {e}")
        raise HTTPException(status_code=500, detail=str(e))
