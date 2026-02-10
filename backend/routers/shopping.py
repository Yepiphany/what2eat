from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from models.database import get_supabase_client
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

def ensure_user_exists(user_id: str) -> bool:
    """Check if user exists, if not create a placeholder user"""
    try:
        supabase = get_supabase_client()
        if supabase is None:
            return False
        result = supabase.table("users").select("id").eq("id", user_id).execute()
        if result.data:
            return True
        
        supabase.table("users").insert({
            "id": user_id,
            "username": f"User_{user_id[:8]}",
            "email": None
        }).execute()
        print(f"[INFO] Auto-created user record: {user_id[:8]}...")
        return True
    except Exception as e:
        print(f"[WARN] Failed to ensure user exists: {e}")
        return False

class ShoppingItem(BaseModel):
    name: str
    completed: bool = False

class ShoppingListCreate(BaseModel):
    recipe_id: str
    items: List[str]
    recipe_title: Optional[str] = None

@router.post("")
async def create_shopping_list(request: ShoppingListCreate, user_id: str):
    try:
        ensure_user_exists(user_id)
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        items_with_status = [{"name": item, "completed": False} for item in request.items]
        
        data = {
            "user_id": user_id,
            "recipe_id": request.recipe_id,
            "items": items_with_status,
            "status": "pending"
        }
        
        result = supabase.table("shopping_lists").insert(data).execute()
        
        if result.data:
            return {"message": "Added to shopping list", "id": result.data[0].get("id")}
        
        raise HTTPException(status_code=500, detail="Failed to add to shopping list")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def get_shopping_lists(user_id: str, status: Optional[str] = Query(default=None)):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        query = supabase.table("shopping_lists").select("*, recipes(title)").eq("user_id", user_id)
        
        if status:
            query = query.eq("status", status)
        
        result = query.order("created_at", desc=True).execute()
        
        if result.data:
            for item in result.data:
                recipe_data = item.get("recipes")
                if recipe_data and isinstance(recipe_data, dict):
                    item["recipe_title"] = recipe_data.get("title")
                else:
                    item["recipe_title"] = None
                item.pop("recipes", None)
        
        return result.data if result.data else []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{item_id}")
async def delete_shopping_list(item_id: str, user_id: str):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        result = supabase.table("shopping_lists").delete().eq("id", item_id).eq("user_id", user_id).execute()
        
        return {"message": "Item deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{item_id}/complete")
async def complete_shopping_list(item_id: str, user_id: str):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        result = supabase.table("shopping_lists").update({"status": "completed"}).eq("id", item_id).eq("user_id", user_id).execute()
        
        return {"message": "Item marked as completed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{item_id}/toggle-item")
async def toggle_shopping_list_item(item_id: str, user_id: str, item_index: int = Query(...)):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        result = supabase.table("shopping_lists").select("*").eq("id", item_id).eq("user_id", user_id).execute()
        
        if result.data:
            items = result.data[0].get("items", [])
            if isinstance(items, list) and 0 <= item_index < len(items):
                if isinstance(items[item_index], dict):
                    items[item_index]["completed"] = not items[item_index]["completed"]
                else:
                    items[item_index] = {"Name": items[item_index], "completed": True}
                
                supabase.table("shopping_lists").update({"items": items}).eq("id", item_id).execute()
                
                return {"message": "Item toggled successfully", "items": items}
            
            raise HTTPException(status_code=404, detail="Item index not found")
        
        raise HTTPException(status_code=404, detail="Shopping list item not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("")
async def clear_all_shopping_lists(user_id: str):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        supabase.table("shopping_lists").delete().eq("user_id", user_id).execute()
        
        return {"message": "All shopping lists cleared"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
