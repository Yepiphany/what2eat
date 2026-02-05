@echo off
chcp 65001 >nul
set PATH=D:\Software\nodejs;%PATH%

echo.
echo ========================================
echo    What2Eat 前端启动脚本
echo ========================================

cd /d "%~dp0"

echo.
echo [1] Node.js 版本:
node --version
if %errorlevel% neq 0 (
    echo     ✗ Node.js 未找到
    pause
    exit /b 1
)

echo.
echo [2] npm 版本:
npm --version
if %errorlevel% neq 0 (
    echo     ✗ npm 未找到
    pause
    exit /b 1
)

echo.
echo [3] 检查依赖目录:
if exist "node_modules" (
    echo     ✓ node_modules 已存在
) else (
    echo     正在安装依赖...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo.
        echo     ✗ 依赖安装失败
        pause
        exit /b 1
    )
    echo.
    echo     ✓ 依赖安装完成
)

echo.
echo [4] 启动开发服务器:
echo     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo     前端地址: http://localhost:5173
echo     文档地址: http://localhost:5173/docs
echo     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo     按 Ctrl+C 停止服务器
echo.
echo ========================================
echo.

npm run dev
