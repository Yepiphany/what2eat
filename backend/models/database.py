from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = None

def get_supabase_client() -> Client:
    global supabase
    
    if supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            class _StubResult:
                data = []
            class _StubQuery:
                def select(self, *args, **kwargs): return self
                def insert(self, *args, **kwargs): return self
                def update(self, *args, **kwargs): return self
                def delete(self, *args, **kwargs): return self
                def eq(self, *args, **kwargs): return self
                def order(self, *args, **kwargs): return self
                def limit(self, *args, **kwargs): return self
                def execute(self): return _StubResult()
            class _StubClient:
                def table(self, name): return _StubQuery()
            supabase = _StubClient()
        else:
            try:
                supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            except Exception as e:
                print(f"Warning: Failed to initialize Supabase client: {e}")
                print("Some features may not work without database connection.")
                class _StubResult:
                    data = []
                class _StubQuery:
                    def select(self, *args, **kwargs): return self
                    def insert(self, *args, **kwargs): return self
                    def update(self, *args, **kwargs): return self
                    def delete(self, *args, **kwargs): return self
                    def eq(self, *args, **kwargs): return self
                    def order(self, *args, **kwargs): return self
                    def limit(self, *args, **kwargs): return self
                    def execute(self): return _StubResult()
                class _StubClient:
                    def table(self, name): return _StubQuery()
                supabase = _StubClient()
    
    return supabase

async def init_database():
    client = get_supabase_client()
    if client is None:
        return False
    
    try:
        result = client.table("users").select("count", head=True).execute()
        print("✓ Supabase connection successful")
        return True
    except Exception as e:
        print(f"✗ Supabase connection failed: {e}")
        print("  The application will run in demo mode without database.")
        return False
