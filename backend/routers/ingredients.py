from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from typing import List, Optional
import base64
import io
from PIL import Image
from services.vision_service import analyze_ingredients_image
from models.database import get_supabase_client
from models.schemas import IngredientCreate, IngredientResponse
from datetime import datetime
import uuid

router = APIRouter()
supabase = get_supabase_client()
FALLBACK_INGREDIENTS: list = []
KNOWN_USERS: set[str] = set()

def ensure_user_exists(user_id: str) -> bool:
    """Check if user exists, if not create a placeholder user"""
    try:
        if user_id in KNOWN_USERS:
            return True

        result = supabase.table("users").select("id").eq("id", user_id).execute()
        if result.data:
            KNOWN_USERS.add(user_id)
            return True
        
        supabase.table("users").insert({
            "id": user_id,
            "username": f"User_{user_id[:8]}",
            "email": None
        }).execute()
        print(f"[INFO] Auto-created user record: {user_id[:8]}...")
        KNOWN_USERS.add(user_id)
        return True
    except Exception as e:
        print(f"[WARN] Failed to ensure user exists: {e}")
        return False

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

@router.post("")
async def add_ingredient(ingredient: IngredientCreate, user_id: str):
    try:
        ensure_user_exists(user_id)
        data = ingredient.model_dump()
        data["user_id"] = user_id
        
        result = supabase.table("ingredients").insert(data).execute()
        
        if result.data:
            return IngredientResponse(**result.data[0])
        else:
            now = datetime.now().isoformat()
            item = {
                **data,
                "id": str(uuid.uuid4()),
                "created_at": now,
                "updated_at": now,
            }
            if item.get("expiry_date"):
                try:
                    expiry = item["expiry_date"]
                    if isinstance(expiry, str):
                        expiry_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
                    else:
                        expiry_dt = expiry
                    days_left = (expiry_dt - datetime.now()).days
                    item["days_until_expiry"] = days_left
                    item["is_expiring_soon"] = days_left <= 2
                except Exception:
                    item["days_until_expiry"] = None
                    item["is_expiring_soon"] = False
            else:
                item["days_until_expiry"] = None
                item["is_expiring_soon"] = False
            try:
                resp = IngredientResponse(**item)
            except Exception as ve:
                raise HTTPException(status_code=400, detail=f"Validation error: {ve}")
            FALLBACK_INGREDIENTS.append(resp.model_dump())
            return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch", response_model=List[IngredientResponse])
async def add_ingredients_batch(ingredients: List[IngredientCreate], user_id: str):
    try:
        if not ingredients:
            return []

        ensure_user_exists(user_id)
        payload = []
        for ingredient in ingredients:
            data = ingredient.model_dump()
            data["user_id"] = user_id
            payload.append(data)

        result = supabase.table("ingredients").insert(payload).execute()

        if result.data:
            return [IngredientResponse(**item) for item in result.data]

        now = datetime.now().isoformat()
        fallback_items: List[IngredientResponse] = []
        for data in payload:
            item = {
                **data,
                "id": str(uuid.uuid4()),
                "created_at": now,
                "updated_at": now,
            }
            if item.get("expiry_date"):
                try:
                    expiry = item["expiry_date"]
                    if isinstance(expiry, str):
                        expiry_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
                    else:
                        expiry_dt = expiry
                    days_left = (expiry_dt - datetime.now()).days
                    item["days_until_expiry"] = days_left
                    item["is_expiring_soon"] = days_left <= 2
                except Exception:
                    item["days_until_expiry"] = None
                    item["is_expiring_soon"] = False
            else:
                item["days_until_expiry"] = None
                item["is_expiring_soon"] = False

            resp = IngredientResponse(**item)
            FALLBACK_INGREDIENTS.append(resp.model_dump())
            fallback_items.append(resp)

        return fallback_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}", response_model=List[IngredientResponse])
async def get_user_ingredients(user_id: str):
    try:
        result = supabase.table("ingredients").select("*").eq("user_id", user_id).execute()
        
        if result.data:
            ingredients = []
            
            for item in result.data:
                item_dict = dict(item)
                if item.get("expiry_date"):
                    expiry = datetime.fromisoformat(item["expiry_date"].replace("Z", "+00:00"))
                    days_left = (expiry - datetime.now()).days
                    item_dict["days_until_expiry"] = days_left
                    item_dict["is_expiring_soon"] = days_left <= 2
                
                ingredients.append(IngredientResponse(**item_dict))
            
            return ingredients
        
        # Fallback to in-memory storage
        return [
            IngredientResponse(**item)
            for item in FALLBACK_INGREDIENTS
            if item.get("user_id") == user_id
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{ingredient_id}")
async def delete_ingredient(ingredient_id: str, user_id: str):
    try:
        result = supabase.table("ingredients").delete().eq("id", ingredient_id).execute()
        
        if result.data:
            return {"message": "Ingredient deleted successfully"}
        
        # Fallback delete
        global FALLBACK_INGREDIENTS
        before = len(FALLBACK_INGREDIENTS)
        FALLBACK_INGREDIENTS = [i for i in FALLBACK_INGREDIENTS if i["id"] != ingredient_id]
        after = len(FALLBACK_INGREDIENTS)
        if after < before:
            return {"message": "Ingredient deleted successfully"}
        raise HTTPException(status_code=404, detail="Ingredient not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("")
async def clear_all_ingredients(user_id: str):
    try:
        result = supabase.table("ingredients").delete().eq("user_id", user_id).execute()
        
        global FALLBACK_INGREDIENTS
        FALLBACK_INGREDIENTS = [i for i in FALLBACK_INGREDIENTS if i.get("user_id") != user_id]
        
        return {"message": f"All ingredients cleared for user {user_id}"}
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
            # Fallback update
            for i, item in enumerate(FALLBACK_INGREDIENTS):
                if item["id"] == ingredient_id:
                    updated = {**item, **data, "updated_at": datetime.now().isoformat()}
                    if updated.get("expiry_date"):
                        try:
                            expiry = updated["expiry_date"]
                            if isinstance(expiry, str):
                                expiry_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
                            else:
                                expiry_dt = expiry
                            days_left = (expiry_dt - datetime.now()).days
                            updated["days_until_expiry"] = days_left
                            updated["is_expiring_soon"] = days_left <= 2
                        except Exception:
                            updated["days_until_expiry"] = None
                            updated["is_expiring_soon"] = False
                    FALLBACK_INGREDIENTS[i] = updated
                    return IngredientResponse(**updated)
            raise HTTPException(status_code=404, detail="Ingredient not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
