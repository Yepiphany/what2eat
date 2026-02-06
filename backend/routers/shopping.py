from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from models.database import get_supabase_client
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class ShoppingItem(BaseModel):
    name: str
    completed: bool = False

class ShoppingListCreate(BaseModel):
    recipe_id: str
    items: List[str]
    recipe_title: Optional[str] = None

@router.post("/shopping-list")
async def create_shopping_list(request: ShoppingListCreate):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        user_id = "00000000-0000-0000-0000-000000000000"
        
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

@router.get("/shopping-list")
async def get_shopping_lists(status: Optional[str] = Query(default=None)):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        user_id = "00000000-0000-0000-0000-000000000000"
        
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

@router.delete("/shopping-list/{item_id}")
async def delete_shopping_list(item_id: str):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        user_id = "00000000-0000-0000-0000-000000000000"
        
        result = supabase.table("shopping_lists").delete().eq("id", item_id).eq("user_id", user_id).execute()
        
        return {"message": "Item deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/shopping-list/{item_id}/complete")
async def complete_shopping_list(item_id: str):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        user_id = "00000000-0000-0000-0000-000000000000"
        
        result = supabase.table("shopping_lists").update({"status": "completed"}).eq("id", item_id).eq("user_id", user_id).execute()
        
        return {"message": "Item marked as completed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/shopping-list/{item_id}/toggle-item")
async def toggle_shopping_list_item(item_id: str, item_index: int = Query(...)):
    try:
        supabase = get_supabase_client()
        if supabase is None:
            raise HTTPException(status_code=500, detail="Database connection failed")
        
        user_id = "00000000-0000-0000-0000-000000000000"
        
        result = supabase.table("shopping_lists").select("*").eq("id", item_id).eq("user_id", user_id).execute()
        
        if result.data:
            items = result.data[0].get("items", [])
            if isinstance(items, list) and 0 <= item_index < len(items):
                if isinstance(items[item_index], dict):
                    items[item_index]["completed"] = not items[item_index]["completed"]
                else:
                    items[item_index] = {"name": items[item_index], "completed": True}
                
                supabase.table("shopping_lists").update({"items": items}).eq("id", item_id).execute()
                
                return {"message": "Item toggled successfully", "items": items}
            
            raise HTTPException(status_code=404, detail="Item index not found")
        
        raise HTTPException(status_code=404, detail="Shopping list item not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
