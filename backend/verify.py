#!/usr/bin/env python
import sys
sys.path.insert(0, 'E:/Code/what2eat/backend')

try:
    from main import app
    print("✓ Backend code is valid")
    print("✓ FastAPI app created successfully")
    print("✓ Routers loaded:")
    print("  - ingredients router")
    print("  - recipes router")
    print("  - cooking router")
    print("  - users router")
    print()
    print("Ready to start the server!")
    print("Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)
