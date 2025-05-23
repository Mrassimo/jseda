@echo off
REM EDA App - Windows Browser Launcher Script

echo Starting EDA App...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start the server and open browser
echo Starting server on http://localhost:3030
echo.

REM Open browser after 2 seconds
start /b cmd /c "timeout /t 2 >nul && start http://localhost:3030"

REM Start the Node.js server
node server.js