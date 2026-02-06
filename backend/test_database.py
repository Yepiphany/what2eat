import os
import sys
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("=" * 50)
print("Supabase 数据库配置检查")
print("=" * 50)

print(f"\n1. URL 配置:")
print(f"   {SUPABASE_URL}")
if SUPABASE_URL:
    print("   ✓ URL 已配置")
else:
    print("   ✗ URL 缺失")
    sys.exit(1)

print(f"\n2. KEY 配置:")
if SUPABASE_KEY:
    key_preview = SUPABASE_KEY[:20] + "..."
    print(f"   {key_preview}")
    print("   ✓ KEY 已配置")
else:
    print("   ✗ KEY 缺失")
    sys.exit(1)

print(f"\n3. 测试连接...")
try:
    from supabase import create_client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    result = client.table("recipes").select("id,title").limit(3).execute()
    
    print("   ✓ 连接成功!")
    print(f"   获取到 {len(result.data)} 条食谱数据:")
    
    for recipe in result.data:
        print(f"   - {recipe.get('title', 'Unknown')}")
    
except Exception as e:
    print(f"   ✗ 连接失败: {e}")
    print("\n可能原因:")
    print("   - 网络问题")
    print("   - API Key 已过期")
    print("   - 数据库表尚未创建")
    sys.exit(1)

print("\n" + "=" * 50)
print("数据库配置正常!")
print("=" * 50)
