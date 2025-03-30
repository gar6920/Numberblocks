@echo off
setlocal enabledelayedexpansion

REM --- Dependency Check & Installation ---
echo.
echo Verifying and installing dependencies...
call npm ci
if %errorlevel% neq 0 (
    echo npm ci failed! Exiting.
    pause
    exit /b %errorlevel%
)
echo Dependencies are up to date.

REM Kill any existing Node.js processes
echo Killing any existing Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

REM Start the server with the default implementation
echo Starting server with default implementation...
start "3D AI Game Server" /B cmd /c "set GAME_IMPLEMENTATION=default && start_server.bat > server_output.tmp 2>&1"

REM Wait for server to initialize
echo Waiting for server to initialize...
timeout /t 5 /nobreak >nul

:PLAYER_COUNT
cls
echo ===== 3D AI Game Platform =====
echo Choose number of players (1-4):
echo 1 - Single player (fullscreen)
echo 2 - Two players (split screen)
echo 3 - Three players
echo 4 - Four players
echo.
set /p PLAYER_COUNT="Enter number of players (1-4): "

REM Validate input
if !PLAYER_COUNT! LSS 1 goto PLAYER_COUNT
if !PLAYER_COUNT! GTR 4 goto PLAYER_COUNT

REM Check if Chrome exists in both possible locations
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_PATH%" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

if not exist "%CHROME_PATH%" (
    echo ERROR: Could not find Chrome browser.
    echo Please make sure Chrome is installed or update this script with the correct path.
    pause
    exit /b 1
)

REM Get the full path to the HTML files
set "SETUP_FILE=%~dp0four_player_setup.html"
set "SINGLE_FILE=%~dp0client/index.html"

REM Launch appropriate number of clients
if !PLAYER_COUNT!==1 (
    echo Opening single player mode...
    start "" "%CHROME_PATH%" --app="http://localhost:3000"
) else (
    echo Opening !PLAYER_COUNT!-player setup...
    start "" "%CHROME_PATH%" --app="file:///%SETUP_FILE:\=/%?players=!PLAYER_COUNT!"
)

echo.
echo Game launched! 
echo Press F11 in the browser for fullscreen mode.
echo.
echo Server is running at http://localhost:3000
echo To quit, close all windows and press Ctrl+C in the server window.

REM Clean up temporary file
REM Commented out to prevent file access error as server is still using it
REM if exist server_output.tmp del server_output.tmp

pause 