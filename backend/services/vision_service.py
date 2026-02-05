from typing import List, Dict, Optional
from openai import OpenAI
from dotenv import load_dotenv
import os
import json

load_dotenv()

# 使用 ModelScope AI API (Moonshot AI Kimi)
base_url = os.getenv("MODELSCOPE_BASE_URL", "https://api-inference.modelscope.cn/v1")
api_key = os.getenv("MODELSCOPE_API_KEY", "")

model_scope_client = OpenAI(
    base_url=base_url,
    api_key=api_key
)

# 备用的 OpenAI 客户端（如果 ModelScope 不可用）
openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    openai_client = OpenAI(api_key=openai_api_key)
else:
    openai_client = None

def analyze_ingredients_image(image_base64: str) -> List[Dict]:
    """
    使用 ModelScope AI 分析图片中的食材
    """
    try:
        model = os.getenv("MODELSCOPE_VISION_MODEL", "moonshotai/Kimi-K2.5")
        
        response = model_scope_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": """你是一个专业的食材识别专家。请分析图片中的所有食材，并返回JSON格式的识别结果。

对于每种食材，请提供：
1. name: 食材名称（中文）
2. category: 食材类别（vegetable, meat, seafood, dairy, egg, grain, fruit, seasoning, beverage, other）
3. quantity: 数量估算（数值）
4. unit: 单位（个、斤、克、毫升等）
5. estimated_expiry_days: 预估保质期（天数）

注意：
- 识别所有可见的食材
- 对于冷藏食材（如蔬菜、肉类），保质期通常是3-7天
- 对于干货或调料，保质期可以是30天以上
- 如果无法确定数量，标记为1
- 只返回JSON数组，不要有其他文字
"""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        
        content = response.choices[0].message.content
        
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            result = {"ingredients": []}
            import re
            ingredient_names = re.findall(r'["\']([^"\']+)["\']', content)
            for name in ingredient_names:
                if name and len(name) <= 10 and not any(kw in name for kw in ['步骤', '说明', '注意']):
                    result["ingredients"].append({
                        "name": name,
                        "category": "other",
                        "quantity": 1,
                        "unit": "个",
                        "estimated_expiry_days": 7
                    })
        
        if isinstance(result, dict) and "ingredients" in result:
            return result["ingredients"]
        elif isinstance(result, list):
            return result
        else:
            return []
    
    except Exception as e:
        print(f"ModelScope vision analysis error: {e}")
        
        # 如果 ModelScope 失败，尝试使用 OpenAI
        if openai_client:
            print("尝试使用 OpenAI 作为备选...")
            return analyze_with_openai(image_base64)
        
        return []

def analyze_with_openai(image_base64: str) -> List[Dict]:
    """备用的 OpenAI 分析方法"""
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """你是一个专业的食材识别专家。请分析图片中的所有食材，并返回JSON格式的识别结果。

对于每种食材，请提供：
1. name: 食材名称（中文）
2. category: 食材类别（vegetable, meat, seafood, dairy, egg, grain, fruit, seasoning, beverage, other）
3. quantity: 数量估算（数值）
4. unit: 单位（个、斤、克、毫升等）
5. estimated_expiry_days: 预估保质期（天数）

注意：
- 识别所有可见的食材
- 只返回JSON数组，不要有其他文字
"""
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        result = json.loads(content)
        
        if isinstance(result, dict) and "ingredients" in result:
            return result["ingredients"]
        elif isinstance(result, list):
            return result
        else:
            return []
    
    except Exception as e:
        print(f"OpenAI fallback error: {e}")
        return []

def get_ingredient_substitutions(ingredient_name: str) -> List[str]:
    """
    获取食材替代品推荐
    """
    try:
        model = os.getenv("MODELSCOPE_VISION_MODEL", "moonshotai/Kimi-K2.5")
        
        response = model_scope_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": f"""你是一个专业厨师。对于食材'{ingredient_name}'，请提供可能的替代食材列表。

要求：
- 只提供中文替代食材名称
- 考虑口味相似度和烹饪用途
- 返回JSON格式：{{"substitutions": ["替代1", "替代2"]}}
- 只返回食材名称，不要其他说明
"""
                },
                {
                    "role": "user",
                    "content": f"提供{ingredient_name}的替代食材"
                }
            ],
            max_tokens=200
        )
        
        content = response.choices[0].message.content
        
        try:
            result = json.loads(content)
        except json.JSONDecodeError:
            result = {"substitutions": []}
        
        if isinstance(result, dict) and "substitutions" in result:
            return result["substitutions"]
        elif isinstance(result, list):
            return result
        else:
            return []
    
    except Exception as e:
        print(f"Substitution lookup error: {e}")
        return []

def get_shopping_recommendations(ingredients: List[str], missing_count: Dict[str, int]) -> Dict:
    """
    生成购物推荐清单
    """
    try:
        model = os.getenv("MODELSCOPE_VISION_MODEL", "moonshotai/Kimi-K2.5")
        
        response = model_scope_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": """你是一个专业的购物助手。请根据用户现有的食材和缺少的配料，提供购物建议。

返回JSON格式：
{
    "shopping_list": [
        {"item": "缺少的食材名称", "quantity": 数量, "unit": 单位, "priority": "high/medium/low"}
    ],
    "tips": ["购买建议1", "购买建议2"]
}

优先级规则：
- 高优先级：做某道菜的关键配料
- 中优先级：可以替代的配料
- 低优先级：可选配料

只返回JSON，不要其他文字
"""
                },
                {
                    "role": "user",
                    "content": f"现有食材: {', '.join(ingredients)}\n缺少配料: {missing_count}"
                }
            ],
            max_tokens=500
        )
        
        content = response.choices[0].message.content
        
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {"shopping_list": [], "tips": []}
    
    except Exception as e:
        print(f"Shopping recommendation error: {e}")
        return {"shopping_list": [], "tips": []}
