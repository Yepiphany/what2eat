from typing import List, Dict, Optional
from models.recipe_schemas import TastePreference, DietType, RecipeDifficulty
from dotenv import load_dotenv
from openai import OpenAI
import os
import json
import uuid
import hashlib
import re
from datetime import datetime, timedelta
from datetime import timezone

load_dotenv()

MODELSCOPE_BASE_URL = os.getenv("MODELSCOPE_BASE_URL", "https://api-inference.modelscope.cn/v1")
MODELSCOPE_API_KEY = os.getenv("MODELSCOPE_API_KEY", "")
MODELSCOPE_VISION_MODEL = os.getenv("MODELSCOPE_VISION_MODEL", "deepseek-ai/DeepSeek-V3.2")

CACHE_DURATION_HOURS = int(os.getenv("RECIPE_CACHE_HOURS", "24"))

def generate_recipe_id() -> str:
    return str(uuid.uuid4())

def generate_ingredients_hash(ingredients: List[str], taste_preferences: Optional[List[TastePreference]] = None, diet_type: Optional[DietType] = None) -> str:
    key_data = {
        "ingredients": sorted([i.lower().strip() for i in ingredients]),
        "taste_preferences": sorted([t.value for t in taste_preferences]) if taste_preferences else [],
        "diet_type": diet_type.value if diet_type else None
    }
    key_str = json.dumps(key_data, sort_keys=True)
    return hashlib.md5(key_str.encode()).hexdigest()

def enhance_recipe_with_matching(recipe: Dict, available_ingredients: List[str]) -> Dict:
    available_set = set(available_ingredients)
    recipe_ingredients = set(recipe.get("ingredients", []))
    matched = list(recipe_ingredients & available_set)
    missing = list(recipe_ingredients - available_set)
    match_percentage = round(len(matched) / len(recipe_ingredients) * 100, 1) if recipe_ingredients else 0
    
    recipe["matched_ingredients"] = matched
    recipe["missing_ingredients"] = missing
    recipe["match_percentage"] = match_percentage
    
    return recipe

def get_cached_recipes(ingredients_hash: str) -> Optional[List[Dict]]:
    try:
        from models.database import get_supabase_client
        client = get_supabase_client()
        if client is None:
            return None
        
        result = client.table("recipe_cache").select("recipes, created_at").eq("ingredients_hash", ingredients_hash).execute()
        
        if result.data and len(result.data) > 0:
            cache_entry = result.data[0]
            recipes = cache_entry.get("recipes", [])
            created_at = cache_entry.get("created_at", "")
            
            if created_at:
                cache_time = datetime.fromisoformat(created_at.replace("Z", "+00:00")).replace(tzinfo=timezone.utc)
                current_time = datetime.now(timezone.utc)
                if current_time - cache_time < timedelta(hours=CACHE_DURATION_HOURS):
                    return recipes
            
            return recipes
    except Exception as e:
        print(f"Database cache lookup failed: {e}")
    
    return None

def save_recipes_to_cache(ingredients_hash: str, ingredients: List[str], recipes: List[Dict], taste_preferences: Optional[List[TastePreference]] = None, diet_type: Optional[DietType] = None):
    try:
        from models.database import get_supabase_client
        client = get_supabase_client()
        if client is None:
            return
        
        data = {
            "ingredients_hash": ingredients_hash,
            "ingredients_list": ingredients,
            "recipes": recipes,
            "taste_preferences": [t.value for t in taste_preferences] if taste_preferences else [],
            "diet_type": diet_type.value if diet_type else None
        }
        
        client.table("recipe_cache").upsert(data, on_conflict="ingredients_hash").execute()
        print(f"Saved {len(recipes)} recipes to cache")
        
        for recipe in recipes:
            save_recipe_to_database(recipe)
    except Exception as e:
        print(f"Failed to save recipes to cache: {e}")

def save_recipe_to_database(recipe: Dict):
    try:
        from models.database import get_supabase_client
        client = get_supabase_client()
        if client is None:
            return
        
        existing = client.table("recipes").select("id").eq("id", recipe.get("id")).execute()
        
        data = {
            "id": recipe.get("id"),
            "title": recipe.get("title"),
            "description": recipe.get("description"),
            "ingredients": recipe.get("ingredients", []),
            "steps": recipe.get("steps", []),
            "cooking_time": recipe.get("cooking_time", 30),
            "difficulty": recipe.get("difficulty", "medium"),
            "taste_tags": recipe.get("taste_tags", []),
            "diet_types": recipe.get("diet_types", []),
            "calories": recipe.get("calories"),
            "servings": recipe.get("servings", 2),
            "matched_ingredients": recipe.get("matched_ingredients", []),
            "missing_ingredients": recipe.get("missing_ingredients", []),
            "match_percentage": recipe.get("match_percentage", 0),
            "image_url": recipe.get("image_url")
        }
        
        if existing.data and len(existing.data) > 0:
            client.table("recipes").update(data).eq("id", recipe.get("id")).execute()
        else:
            client.table("recipes").insert(data).execute()
        
        print(f"Saved recipe to database: {recipe.get('title')}")
    except Exception as e:
        print(f"Failed to save recipe to database: {e}")

def get_recipe_from_database(recipe_id: str) -> Optional[Dict]:
    try:
        from models.database import get_supabase_client
        client = get_supabase_client()
        if client is None:
            return None
        
        result = client.table("recipes").select("*").eq("id", recipe_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
    except Exception as e:
        print(f"Failed to get recipe from database: {e}")
    
    return None

async def get_ai_batch_recipes(
    available_ingredients: List[str],
    taste_preferences: Optional[List[TastePreference]] = None,
    diet_type: Optional[DietType] = None,
    count: int = 3,
    force_refresh: bool = False
) -> List[Dict]:
    if not available_ingredients:
        return []
    
    ingredients_hash = generate_ingredients_hash(available_ingredients, taste_preferences, diet_type)
    
    if not force_refresh:
        cached = get_cached_recipes(ingredients_hash)
        if cached is not None:
            print(f"Cache hit for ingredients hash: {ingredients_hash[:8]}...")
            return cached[:count]
    
    print(f"Cache miss for ingredients hash: {ingredients_hash[:8]}..., calling AI API...")
    
    if not MODELSCOPE_API_KEY:
        return []
    
    try:
        taste_str = ", ".join([t.value for t in taste_preferences]) if taste_preferences else "任意"
        diet_str = diet_type.value if diet_type else "任意"
        ingredients_str = ", ".join(available_ingredients)
        
        client = OpenAI(
            base_url=MODELSCOPE_BASE_URL,
            api_key=MODELSCOPE_API_KEY
        )
        
        response = client.chat.completions.create(
            model=MODELSCOPE_VISION_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": f"""你是一个专业厨师。请根据用户现有食材设计菜品。

现有食材: {ingredients_str}
口味偏好: {taste_str}
饮食限制: {diet_str}

请直接返回5道菜（四菜一汤），包含：
- 2道荤菜（需要肉类/海鲜/蛋）
- 2道素菜（纯蔬菜/豆制品）
- 1道汤品

**重要**：无论用户是否有肉类食材，都必须推荐2道荤菜。如果用户没有肉类，请推荐需要常见肉类的菜品（如猪肉、鸡肉、牛肉等），并将需要的肉类作为缺少食材返回。

严格按照JSON数组格式返回：

[
    {{
        "title": "菜品名称",
        "description": "简短描述",
        "category": "meat/veg/soup",
        "ingredients": ["需要的食材1", "需要的食材2"],
        "steps": ["步骤1", "步骤2"],
        "cooking_time": 15-30,
        "difficulty": "easy/medium/hard",
        "taste_tags": ["口味1"],
        "diet_types": ["normal"],
        "calories": 200-500,
        "servings": 2-4
    }}
]

注意：确保包含2个meat、2个veg、1个soup。即使用户没有肉类食材，也要推荐荤菜。"""
                },
                {
                    "role": "user",
                    "content": f"用{ingredients_str}可以做什么菜？返回JSON数组"
                }
            ],
            max_tokens=2000,
            extra_body={"enable_thinking": False}
        )
        
        content = response.choices[0].message.content
        print(f"AI response content: {content[:500]}...")
        
        import re
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', content)
        if json_match:
            content = json_match.group(1)
        
        all_recipes = []
        
        try:
            recipes_data = json.loads(content)
            if isinstance(recipes_data, list):
                meat_recipes = []
                veg_recipes = []
                soup_recipes = []
                
                for recipe in recipes_data[:count]:
                    if recipe and "title" in recipe:
                        recipe["id"] = generate_recipe_id()
                        recipe = enhance_recipe_with_matching(recipe, available_ingredients)
                        recipe["image_url"] = None
                        
                        category = recipe.get("category", "").lower()
                        ingredients_list = [i.lower() for i in recipe.get("ingredients", [])]
                        
                        has_egg = any("蛋" in ing for ing in ingredients_list)
                        
                        if category == "meat" and has_egg:
                            veg_recipes.append(recipe)
                        elif category == "meat":
                            meat_recipes.append(recipe)
                        elif category == "veg":
                            veg_recipes.append(recipe)
                        elif category == "soup":
                            soup_recipes.append(recipe)
                        else:
                            meat_recipes.append(recipe)
                
                if len(meat_recipes) < 2:
                    needed = 2 - len(meat_recipes)
                    extra_meat = veg_recipes[:needed]
                    veg_recipes = veg_recipes[needed:]
                    meat_recipes.extend(extra_meat)
                
                all_recipes = meat_recipes[:2] + veg_recipes[:2] + soup_recipes[:1]
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}, content: {content}")
        
        if all_recipes:
            save_recipes_to_cache(ingredients_hash, available_ingredients, all_recipes, taste_preferences, diet_type)
        
        return all_recipes[:count]
    
    except Exception as e:
        print(f"AI recipe generation error: {e}")
        return []

def generate_shopping_list(recipe_id: str, user_ingredients: List[str]) -> Dict:
    return {
        "shopping_list": [],
        "tips": ["请查看菜谱详情获取购物清单"]
    }
