from typing import List, Dict, Optional
from openai import OpenAI
from dotenv import load_dotenv
import os
import json
import base64
from io import BytesIO

load_dotenv()

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def analyze_ingredients_image(image_base64: str) -> List[Dict]:
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
        print(f"Vision analysis error: {e}")
        return []

async def get_ingredient_substitutions(ingredient_name: str) -> List[str]:
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": f"""你是一个专业厨师。对于食材'{ingredient_name}'，请提供可能的替代食材列表。

要求：
- 只提供中文替代食材名称
- 考虑口味相似度和烹饪用途
- 返回JSON数组格式
- 只返回食材名称，不要其他说明
"""
                },
                {
                    "role": "user",
                    "content": f"提供{ingredient_name}的替代食材"
                }
            ],
            max_tokens=200,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        result = json.loads(content)
        
        if isinstance(result, dict) and "substitutions" in result:
            return result["substitutions"]
        elif isinstance(result, list):
            return result
        else:
            return []
    
    except Exception as e:
        print(f"Substitution lookup error: {e}")
        return []

async def get_shopping_recommendations(ingredients: List[str], missing_count: Dict[str, int]) -> Dict:
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
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
- 中优先级：可以替代或缺的配料
- 低优先级：可选配料

只返回JSON，不要其他文字
"""
                },
                {
                    "role": "user",
                    "content": f"现有食材: {', '.join(ingredients)}\n缺少配料: {missing_count}"
                }
            ],
            max_tokens=500,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        return json.loads(content)
    
    except Exception as e:
        print(f"Shopping recommendation error: {e}")
        return {"shopping_list": [], "tips": []}
