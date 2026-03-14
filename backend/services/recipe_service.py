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

# ModelScope API 配置
MODELSCOPE_BASE_URL = os.getenv("MODELSCOPE_BASE_URL", "https://api-inference.modelscope.cn/v1")
MODELSCOPE_API_KEY = os.getenv("MODELSCOPE_API_KEY", "")
MODELSCOPE_VISION_MODEL = os.getenv("MODELSCOPE_VISION_MODEL", "Qwen/Qwen3-VL-30B-A3B-Instruct")

CACHE_DURATION_HOURS = int(os.getenv("RECIPE_CACHE_HOURS", "24"))
_RECIPES_MEMORY: dict = {}

# 常见调味品缺失默认不提示，避免影响推荐体验。
COMMON_SEASONING_KEYWORDS = [
    "盐", "食盐", "糖", "白糖", "冰糖", "酱油", "生抽", "老抽", "料酒", "米酒", "黄酒",
    "醋", "陈醋", "白醋", "香醋", "蚝油", "鸡精", "味精", "胡椒", "白胡椒", "黑胡椒粉",
    "淀粉", "生粉", "玉米淀粉", "油", "食用油", "花生油", "菜籽油", "橄榄油", "香油",
    "葱", "姜", "蒜", "葱花", "姜末", "蒜末", "十三香"
]

# 这些调味品通常代表菜品风味特征，缺失时应提示。
SIGNATURE_SEASONING_KEYWORDS = [
    "豆瓣酱", "郫县豆瓣", "豆豉", "剁椒", "泡椒", "干辣椒", "花椒", "麻椒",
    "孜然", "咖喱", "番茄酱", "黑椒酱", "照烧汁", "沙茶酱", "甜面酱", "黄豆酱",
    "韩式辣酱", "鱼露", "冬阴功", "芥末"
]

# 根据菜名识别“特色调味品”的弱规则。
TITLE_SIGNATURE_HINTS = {
    "麻婆": ["豆瓣酱", "豆豉", "花椒"],
    "鱼香": ["豆瓣酱", "泡椒", "醋"],
    "宫保": ["花椒", "干辣椒"],
    "咖喱": ["咖喱"],
    "孜然": ["孜然"],
    "黑椒": ["黑椒酱", "黑胡椒"],
    "沙茶": ["沙茶酱"],
    "照烧": ["照烧汁"],
    "韩式": ["韩式辣酱"],
    "泰式": ["鱼露", "冬阴功"],
    "蒜蓉": ["蒜蓉", "蒜"],
    "椒盐": ["椒盐"],
}

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


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", "", (text or "")).lower()


def _contains_any_keyword(text: str, keywords: List[str]) -> bool:
    normalized = _normalize_text(text)
    return any(_normalize_text(keyword) in normalized for keyword in keywords)


def _is_signature_seasoning(ingredient: str, recipe_title: str) -> bool:
    if _contains_any_keyword(ingredient, SIGNATURE_SEASONING_KEYWORDS):
        return True

    for title_hint, seasoning_hints in TITLE_SIGNATURE_HINTS.items():
        if _normalize_text(title_hint) in _normalize_text(recipe_title):
            if _contains_any_keyword(ingredient, seasoning_hints):
                return True
    return False


def _should_ignore_missing_ingredient(ingredient: str, recipe_title: str) -> bool:
    if not _contains_any_keyword(ingredient, COMMON_SEASONING_KEYWORDS):
        return False
    return not _is_signature_seasoning(ingredient, recipe_title)

def enhance_recipe_with_matching(recipe: Dict, available_ingredients: List[str]) -> Dict:
    available_lower = [i.lower().strip() for i in available_ingredients]
    recipe_title = recipe.get("title", "")
    recipe_ingredients = recipe.get("ingredients", [])
    recipe_ingredients_lower = [i.lower().strip() for i in recipe_ingredients]
    
    matched = []
    missing = []
    
    for i, ing in enumerate(recipe_ingredients):
        if _should_ignore_missing_ingredient(ing, recipe_title):
            continue

        ing_lower = recipe_ingredients_lower[i]
        is_matched = False
        
        for avail in available_lower:
            if avail == ing_lower:
                is_matched = True
                break
            if avail in ing_lower or ing_lower in avail:
                is_matched = True
                break
        
        if is_matched:
            matched.append(ing)
        else:
            missing.append(ing)
    
    considered_ingredients_count = len(matched) + len(missing)
    match_percentage = (
        round(len(matched) / considered_ingredients_count * 100, 1)
        if considered_ingredients_count
        else 100.0
    )
    
    recipe["matched_ingredients"] = matched
    recipe["missing_ingredients"] = missing
    recipe["match_percentage"] = match_percentage
    
    return recipe

def get_cached_recipes(ingredients_hash: str) -> Optional[List[Dict]]:
    """
    从缓存获取菜谱。
    注意：不再从 recipe_pages 表查询，因为分页逻辑由前端管理。
    缓存逻辑由前端通过 /api/v1/recipe-pages 接口处理。
    """
    # 返回 None，让前端决定是否使用缓存
    # 前端会通过 /api/v1/recipe-pages 接口获取已保存的分页数据
    return None

def save_recipes_to_cache(ingredients_hash: str, ingredients: List[str], recipes: List[Dict], taste_preferences: Optional[List[TastePreference]] = None, diet_type: Optional[DietType] = None):
    """
    保存菜谱到缓存。
    注意：不再保存到 recipe_pages 表，因为分页逻辑由前端管理。
    前端会通过 /api/v1/recipe-pages 接口来保存分页数据。
    """
    try:
        # 只保存单个菜谱到 recipes 表，用于详情页查询
        for recipe in recipes:
            save_recipe_to_database(recipe)
        
        print(f"Saved {len(recipes)} recipes to database (recipe_pages 由前端管理)")
    except Exception as e:
        print(f"Failed to save recipes to cache: {e}")

def save_recipe_to_database(recipe: Dict):
    try:
        from models.database import get_supabase_client
        client = get_supabase_client()
        _RECIPES_MEMORY[recipe.get("id")] = {
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
        if recipe_id in _RECIPES_MEMORY:
            return _RECIPES_MEMORY[recipe_id]
        if client is None:
            return _RECIPES_MEMORY.get(recipe_id)
        
        result = client.table("recipes").select("*").eq("id", recipe_id).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
    except Exception as e:
        print(f"Failed to get recipe from database: {e}")
    
    return _RECIPES_MEMORY.get(recipe_id)

async def get_ai_batch_recipes(
    available_ingredients: List[str],
    taste_preferences: Optional[List[TastePreference]] = None,
    diet_type: Optional[DietType] = None,
    count: int = 3,
    force_refresh: bool = False,
    max_cooking_time: Optional[int] = None,
    cooking_level: Optional[str] = None
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
        
        # 根据饮食类型生成不同的提示
        diet_descriptions = {
            "balanced": "均衡饮食（荤素搭配，营养均衡）",
            "meat_lover": "爱吃肉（偏好肉类菜品，多推荐荤菜）",
            "vegetable_lover": "爱吃菜（偏好蔬菜菜品，多推荐素菜）",
            "low_carb": "低碳水（减少米饭、面条等主食，多用蔬菜和肉类）"
        }
        diet_str = diet_descriptions.get(diet_type.value if diet_type else "balanced", "均衡饮食")
        ingredients_str = ", ".join(available_ingredients)
        
        # 烹饪水平描述
        level_descriptions = {
            "beginner": "初级（简单易做，步骤少，技巧要求低）",
            "intermediate": "中级（中等难度，需要一定烹饪技巧）",
            "advanced": "高级（复杂菜品，需要较高烹饪技巧）"
        }
        level_str = level_descriptions.get(cooking_level, "任意水平")
        
        # 时间限制
        time_str = f"{max_cooking_time}分钟以内" if max_cooking_time else "不限"
        
        # 根据饮食类型调整菜谱结构
        if diet_type and diet_type.value == "meat_lover":
            category_instruction = """请直接返回5道菜（四菜一汤），包含：
- 3道荤菜（必须包含肉类/海鲜）
- 1道素菜（纯蔬菜/豆制品）
- 1道汤品（可以是肉汤或素汤）"""
        elif diet_type and diet_type.value == "vegetable_lover":
            category_instruction = """请直接返回5道菜（四菜一汤），包含：
- 1道荤菜（包含肉类/海鲜）
- 3道素菜（纯蔬菜/豆制品，不能含肉类）
- 1道素汤"""
        elif diet_type and diet_type.value == "low_carb":
            category_instruction = """请直接返回5道菜（四菜一汤），低碳水饮食：
- 2道荤菜（必须包含肉类/海鲜，不使用淀粉勾芡）
- 2道素菜（纯蔬菜，避免土豆、红薯等高碳水蔬菜）
- 1道汤品（清汤为主，不加淀粉）"""
        else:
            category_instruction = """请直接返回5道菜（四菜一汤），包含：
- 2道荤菜（必须包含肉类/海鲜，如：猪肉、牛肉、鸡肉、鱼虾等，禁止用蛋类冒充荤菜）
- 2道素菜（纯蔬菜/豆制品，不能含肉类）
- 1道汤品"""
        
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
饮食偏好: {diet_str}
烹饪水平: {level_str}
最大烹饪时间: {time_str}

{category_instruction}

**重要规则**：
1. 荤菜必须包含真实肉类（猪肉、牛肉、鸡肉、鱼、虾等），禁止使用蛋类作为荤菜
2. 如果用户没有肉类食材，仍然必须推荐需要肉类的荤菜，将缺少的肉类放到missing_ingredients中
3. 素菜禁止包含任何肉类食材
4. 根据用户的饮食偏好调整菜谱结构
5. taste_tags 必须使用中文，可选值：辣、甜、酸、咸、鲜、清淡、苦
6. missing_ingredients 中忽略常见调味品（如盐、糖、生抽、料酒、葱姜蒜等）；仅在缺少菜品特色调味品时提示（如豆瓣酱、咖喱、孜然、沙茶酱等）

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
        "taste_tags": ["辣"],
        "diet_types": ["balanced"],
        "calories": 200-500,
        "servings": 2-4
    }}
]"""

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
                        
                        meat_keywords = ["肉", "猪", "牛", "羊", "鸭", "鹅", "鱼", "虾", "蟹", "贝", "排骨", "五花", "里脊"]
                        has_egg = any("蛋" in ing for ing in ingredients_list)
                        has_other_meat = any(
                            any(keyword in ing for keyword in meat_keywords)
                            for ing in ingredients_list
                        )
                        
                        if category == "meat":
                            if has_egg and not has_other_meat:
                                veg_recipes.append(recipe)
                            else:
                                meat_recipes.append(recipe)
                        elif category == "veg":
                            veg_recipes.append(recipe)
                        elif category == "soup":
                            soup_recipes.append(recipe)
                        else:
                            meat_recipes.append(recipe)
                
                # 根据饮食类型调整菜谱结构，确保总是返回5道菜
                if diet_type and diet_type.value == "meat_lover":
                    # 爱吃肉: 3荤1素1汤
                    selected_meat = meat_recipes[:3]
                    selected_veg = veg_recipes[:1]
                    selected_soup = soup_recipes[:1]
                    # 如果不足5道，从其他类型补充
                    total = len(selected_meat) + len(selected_veg) + len(selected_soup)
                    if total < 5:
                        needed = 5 - total
                        # 先从素菜补充
                        extra_veg = veg_recipes[1:1+needed]
                        selected_veg.extend(extra_veg)
                        needed -= len(extra_veg)
                        # 再从荤菜补充
                        if needed > 0:
                            extra_meat = meat_recipes[3:3+needed]
                            selected_meat.extend(extra_meat)
                            needed -= len(extra_meat)
                        # 最后从汤补充
                        if needed > 0:
                            extra_soup = soup_recipes[1:1+needed]
                            selected_soup.extend(extra_soup)
                    all_recipes = selected_meat + selected_veg + selected_soup
                elif diet_type and diet_type.value == "vegetable_lover":
                    # 爱吃菜: 1荤3素1汤
                    selected_meat = meat_recipes[:1]
                    selected_veg = veg_recipes[:3]
                    selected_soup = soup_recipes[:1]
                    # 如果不足5道，从其他类型补充
                    total = len(selected_meat) + len(selected_veg) + len(selected_soup)
                    if total < 5:
                        needed = 5 - total
                        # 先从荤菜补充
                        extra_meat = meat_recipes[1:1+needed]
                        selected_meat.extend(extra_meat)
                        needed -= len(extra_meat)
                        # 再从素菜补充
                        if needed > 0:
                            extra_veg = veg_recipes[3:3+needed]
                            selected_veg.extend(extra_veg)
                            needed -= len(extra_veg)
                        # 最后从汤补充
                        if needed > 0:
                            extra_soup = soup_recipes[1:1+needed]
                            selected_soup.extend(extra_soup)
                    all_recipes = selected_meat + selected_veg + selected_soup
                else:
                    # 均衡饮食和低碳水: 2荤2素1汤
                    selected_meat = meat_recipes[:2]
                    selected_veg = veg_recipes[:2]
                    selected_soup = soup_recipes[:1]
                    # 如果不足5道，从其他类型补充
                    total = len(selected_meat) + len(selected_veg) + len(selected_soup)
                    if total < 5:
                        needed = 5 - total
                        # 先从荤菜补充
                        extra_meat = meat_recipes[2:2+needed]
                        selected_meat.extend(extra_meat)
                        needed -= len(extra_meat)
                        # 再从素菜补充
                        if needed > 0:
                            extra_veg = veg_recipes[2:2+needed]
                            selected_veg.extend(extra_veg)
                            needed -= len(extra_veg)
                        # 最后从汤补充
                        if needed > 0:
                            extra_soup = soup_recipes[1:1+needed]
                            selected_soup.extend(extra_soup)
                    all_recipes = selected_meat + selected_veg + selected_soup
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
