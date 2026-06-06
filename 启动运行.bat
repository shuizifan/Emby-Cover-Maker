@echo off
title dynamic-cover-tool dev
cd /d "%~dp0"

echo ============================================
echo  当前目录: %cd%
echo ============================================
echo.

REM 1) 本脚本必须和 package.json 放在同一个文件夹
if not exist "package.json" (
    echo [X] 这个文件夹里没有 package.json
    echo     请把这个 .bat 放进 dynamic-cover-tool 文件夹里再双击
    echo.
    pause
    exit /b
)

REM 2) 确认 Node / npm 装了没
where npm >nul 2>nul
if errorlevel 1 (
    echo [X] 没检测到 Node / npm，请先安装 Node.js
    echo     下载地址: https://nodejs.org
    echo.
    pause
    exit /b
)

REM 3) 只有第一次（没有 node_modules）才装依赖
if not exist "node_modules" (
    echo [*] 首次运行，正在安装依赖（npm install）...
    call npm.cmd install
    if errorlevel 1 (
        echo.
        echo [X] 依赖安装失败，请看上面的报错信息
        echo.
        pause
        exit /b
    )
)

REM 4) 启动开发服务器
echo [*] 正在启动开发服务器（npm run dev）...
echo.
call npm.cmd run dev

echo.
echo [i] 开发服务器已停止
pause
