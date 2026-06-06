@echo off
chcp 65001 >nul
title Emby Cover Maker
cd /d "%~dp0"

echo ============================================
echo  Emby Cover Maker - 本地开发启动器
echo  当前目录: %cd%
echo ============================================
echo.

REM 1. 确认 .bat 与 package.json 在同一文件夹
if not exist "package.json" (
    echo [X] 未找到 package.json
    echo     请把 .bat 放在 Emby-Cover-Maker 文件夹内再双击运行
    echo.
    pause
    exit /b
)

REM 2. 确认已安装 Node.js / npm
where npm >nul 2>nul
if errorlevel 1 (
    echo [X] 未检测到 Node.js / npm，请先安装 Node.js
    echo     下载地址: https://nodejs.org
    echo.
    pause
    exit /b
)

REM 3. 首次运行时自动安装依赖
if not exist "node_modules" (
    echo [*] 首次运行，正在安装依赖 (npm install^)...
    call npm.cmd install
    if errorlevel 1 (
        echo.
        echo [X] 依赖安装失败，请查看上方错误信息
        echo.
        pause
        exit /b
    )
    echo.
)

REM 4. 启动本地开发服务器
echo [*] 正在启动本地开发服务器 (npm run dev^)...
echo     启动后请在浏览器打开终端中显示的本地地址 (如 http://localhost:5173)
echo     按 Ctrl+C 可停止服务器
echo.
call npm.cmd run dev

echo.
echo [i] 服务已停止
pause
