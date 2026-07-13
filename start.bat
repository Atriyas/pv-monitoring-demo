@echo off
chcp 65001 >nul
echo ============================================
echo   PV Monitoring System - Standalone Demo
echo ============================================
echo.
echo 方式1: 直接打开 dist/index.html（部分浏览器可能限制）
echo 方式2: 启动本地服务器（推荐）
echo.
echo 按任意键以方式2启动...
echo 登录账号: admin / a123456
echo ============================================
pause >nul

cd /d "%~dp0"
echo Starting server at http://localhost:5174
start http://localhost:5174
python -m http.server 5174 -d dist
pause
