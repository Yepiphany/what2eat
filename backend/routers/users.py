from fastapi import APIRouter, HTTPException
from typing import Optional, List
from models.database import get_supabase_client
from models.user_schemas import (
    UserCreate, UserResponse, UserUpdate, TastePreference, DietType
)

router = APIRouter()
supabase = get_supabase_client()

@router.post("")
async def create_user(user: UserCreate):
    try:
        data = user.model_dump()
        
        result = supabase.table("users").insert(data).execute()
        
        if result.data:
            return UserResponse(**result.data[0])
        else:
            raise HTTPException(status_code=400, detail="Failed to create user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    try:
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if result.data:
            return UserResponse(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_update: UserUpdate):
    try:
        data = user_update.model_dump(exclude_unset=True)
        
        data["updated_at"] = "now()"
        
        result = supabase.table("users").update(data).eq("id", user_id).execute()
        
        if result.data:
            return UserResponse(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{user_id}")
async def delete_user(user_id: str):
    try:
        result = supabase.table("users").delete().eq("id", user_id).execute()
        
        if result.data:
            return {"message": "User deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}/preferences")
async def update_user_preferences(
    user_id: str,
    taste_preferences: Optional[List[TastePreference]] = None,
    diet_type: Optional[DietType] = None,
    max_cooking_time: Optional[int] = None,
    cooking_level: Optional[str] = None
):
    try:
        data = {}
        if taste_preferences is not None:
            data["taste_preferences"] = [p.value for p in taste_preferences]
        if diet_type is not None:
            data["diet_type"] = diet_type.value
        if max_cooking_time is not None:
            data["max_cooking_time"] = max_cooking_time
        if cooking_level is not None:
            data["cooking_level"] = cooking_level
        
        data["updated_at"] = "now()"
        
        result = supabase.table("users").update(data).eq("id", user_id).execute()
        
        if result.data:
            return UserResponse(**result.data[0])
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
