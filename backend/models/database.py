from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in .env file")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_supabase_client() -> Client:
    return supabase

async def init_database():
    try:
        result = supabase.table("users").select("count").execute()
        print("Supabase connection successful")
        return True
    except Exception as e:
        print(f"Supabase connection failed: {e}")
        return False
