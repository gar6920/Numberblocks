@echo off
echo Starting 3D AI Game Server

REM Kill any existing Node.js processes
taskkill /F /IM node.exe >nul 2>&1

REM Start the game server
cd /d "%~dp0server"
echo Server starting - press Ctrl+C to stop
npm start 