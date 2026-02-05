@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    What2Eat 后端启动脚本
echo ========================================

cd /d "%~dp0"

echo.
echo [1] 检测 Python 环境...
echo.

REM 使用 Windows Store 的 Python（已安装依赖）
set PYTHON_PATH=C:\Users\Jason\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe

if exist "%PYTHON_PATH%" (
    echo     找到正确的 Python:
    "%PYTHON_PATH%" --version
    echo.
) else (
    echo     ✗ 未找到正确的 Python
    echo     尝试使用系统 Python...
    set PYTHON_PATH=python
)

echo.
echo [2] 检查 uvicorn...
"%PYTHON_PATH%" -c "import uvicorn; print('     ✓ uvicorn 已安装')"
if %errorlevel% neq 0 (
    echo.
    echo     ✗ uvicorn 未安装，正在安装...
    "%PYTHON_PATH%" -m pip install uvicorn
    if %errorlevel% neq 0 (
        echo.
        echo     ✗ uvicorn 安装失败
        pause
        exit /b 1
    )
    echo     ✓ uvicorn 安装完成
)

echo.
echo [3] 启动 FastAPI 服务器...
echo     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo     API 文档: http://localhost:8000/docs
echo     健康检查: http://localhost:8000/health
echo     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo     按 Ctrl+C 停止服务器
echo ========================================
echo.

"%PYTHON_PATH%" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
