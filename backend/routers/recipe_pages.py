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
        
        print(f"[DEBUG] 查询到 {len(result.data) if result.data else 0} 条记录")
        
        if result.data and len(result.data) > 0:
            page_indexes = [p['page_index'] for p in result.data]
            print(f"[DEBUG] page_index 列表: {page_indexes}")
            
            pages = []
            for i, page in enumerate(result.data):
                recipes = page["recipes"]
                first_title = recipes[0].get('title', 'unknown') if recipes else 'empty'
                second_title = recipes[1].get('title', 'unknown') if len(recipes) > 1 else 'empty'
                print(f"[DEBUG] 第{i+1}页 (page_index={page['page_index']}): {len(recipes)}道菜, 第1道={first_title}, 第2道={second_title}")
                pages.append(recipes)
            
            return {"pages": pages, "current_page": 0}
        
        return {"pages": [], "current_page": 0}
    except Exception as e:
        print(f"[ERROR] Failed to get recipe pages: {e}")
        return {"pages": [], "current_page": 0}

@router.post("/")
async def save_recipe_page(page_data: Dict[str, Any]):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        user_id = "00000000-0000-0000-0000-000000000000"
        recipes = page_data.get("recipes", [])
        ingredients = page_data.get("ingredients", [])
        ingredients_hash = hash_ingredients(ingredients)
        
        # 查询数据库中最大的 page_index
        result = supabase.table("recipe_pages").select("page_index").eq("user_id", user_id).order("page_index", desc=True).limit(1).execute()
        
        print(f"[DEBUG] 查询数据库最大 page_index, 结果: {result.data}")
        
        if result.data and len(result.data) > 0:
            max_page_index = result.data[0]["page_index"]
            new_page_index = max_page_index + 1
            print(f"[DEBUG] 数据库中已有记录, 最大 page_index={max_page_index}, 新 page_index={new_page_index}")
        else:
            new_page_index = 0
            print(f"[DEBUG] 数据库为空, 新 page_index=0")
        
        print(f"[DEBUG] 保存第 {new_page_index + 1} 页 (前端传入的page_index被忽略), 食材hash: {ingredients_hash[:8]}..., 菜谱数: {len(recipes)}")
        if recipes:
            print(f"[DEBUG] 第 {new_page_index + 1} 页第一道菜: {recipes[0].get('title', 'unknown')}")
        
        supabase.table("recipe_pages").insert({
            "user_id": user_id,
            "page_index": new_page_index,
            "recipes": recipes,
            "ingredients_hash": ingredients_hash
        }).execute()
        print(f"[DEBUG] 第 {new_page_index + 1} 页保存成功")
        return {"message": "Recipe page saved", "page_index": new_page_index}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Failed to save recipe page: {e}")
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
