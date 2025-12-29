@echo off
echo ========================================================
echo   Starting Echo Dashboard...
echo   Please wait while we set up the environment.
echo   This might take a few minutes the first time.
echo ========================================================

:: Check if Docker is running
docker info >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Docker is not running! 
    echo Please open "Docker Desktop" and try again.
    echo.
    pause
    exit
)

:: Build and Start the App
docker-compose up -d --build

echo.
echo ========================================================
echo   SUCCESS! The application is running.
echo ========================================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo.
echo   PDF Reports will appear in the 'reports' folder.
echo.
echo   Press any key to close this window...
pause