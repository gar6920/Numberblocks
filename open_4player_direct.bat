@echo off
echo Opening 3D AI Game - Single Window 4-Player Setup

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

REM Get the full path to the four_player_setup.html file
set "SETUP_FILE=%~dp0four_player_setup.html"

echo Opening 4-player game window...
start "" "%CHROME_PATH%" --app="file:///%SETUP_FILE:\=/%"

echo.
echo Setup complete!
echo Press F11 in the browser for fullscreen mode.
echo.
echo Make sure your game server is running at http://localhost:3000 