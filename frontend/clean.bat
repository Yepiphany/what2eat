@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    What2Eat 依赖清理脚本
echo ========================================

echo.
echo [1] 清理旧的 node_modules...
if exist "node_modules" (
    rmdir /s /q node_modules
    echo     ✓ 已清理 node_modules
) else (
    echo     ✓ 无需清理
)

echo.
echo [2] 清理 package-lock.json...
if exist "package-lock.json" (
    del /q package-lock.json
    echo     ✓ 已清理 package-lock.json
)

echo.
echo ========================================
echo    清理完成！
echo ========================================
echo.
echo 现在可以运行 npm install 安装依赖
pause
