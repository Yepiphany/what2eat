@echo off
chcp 65001 >nul
cd /d "%~dp0"
"C:\Users\Jason\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
