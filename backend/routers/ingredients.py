from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Optional
import base64
import io
from PIL import Image
from services.vision_service import analyze_ingredients_image
from models.database import get_supabase_client
from models.schemas import IngredientCreate, IngredientResponse

router = APIRouter()
supabase = get_supabase_client()

@router.post("/scan", response_model=List[dict])
async def scan_ingredients(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        image_data = base64.b64encode(contents).decode("utf-8")
        
        ingredients = await analyze_ingredients_image(image_data)
        
        return ingredients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/scan-base64", response_model=List[dict])
async def scan_ingredients_base64(request: dict):
    try:
        image_data = request.get("image", "")
        
        if not image_data:
            raise HTTPException(status_code=400, detail="Missing image data")
        
        ingredients = await analyze_ingredients_image(image_data)
        
        return ingredients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=IngredientResponse)
async def add_ingredient(ingredient: IngredientCreate, user_id: str):
    try:
        data = ingredient.model_dump()
        data["user_id"] = user_id
        
        result = supabase.table("ingredients").insert(data).execute()
        
        if result.data:
            return IngredientResponse(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Failed to add ingredient")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}", response_model=List[IngredientResponse])
async def get_user_ingredients(user_id: str):
    try:
        result = supabase.table("ingredients").select("*").eq("user_id", user_id).execute()
        
        if result.data:
            ingredients = []
            from datetime import datetime
            
            for item in result.data:
                item_dict = dict(item)
                if item.get("expiry_date"):
                    expiry = datetime.fromisoformat(item["expiry_date"].replace("Z", "+00:00"))
                    days_left = (expiry - datetime.now()).days
                    item_dict["days_until_expiry"] = days_left
                    item_dict["is_expiring_soon"] = days_left <= 2
                
                ingredients.append(IngredientResponse(**item_dict))
            
            return ingredients
        
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{ingredient_id}")
async def delete_ingredient(ingredient_id: str, user_id: str):
    try:
        result = supabase.table("ingredients").delete().eq("id", ingredient_id).eq("user_id", user_id).execute()
        
        if result.data:
            return {"message": "Ingredient deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Ingredient not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{ingredient_id}", response_model=IngredientResponse)
async def update_ingredient(ingredient_id: str, ingredient: IngredientCreate, user_id: str):
    try:
        data = ingredient.model_dump()
        data["user_id"] = user_id
        
        result = supabase.table("ingredients").update(data).eq("id", ingredient_id).execute()
        
        if result.data:
            return IngredientResponse(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="Ingredient not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
