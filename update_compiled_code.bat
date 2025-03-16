@echo off
setlocal enabledelayedexpansion

echo Creating updated compiled_code.txt file...

:: Delete the old file if it exists
if exist compiled_code.txt del compiled_code.txt

:: Create the new file with a header
echo ===================================================== > compiled_code.txt
echo NUMBERBLOCKS GAME - COMPLETE CODE COMPILATION >> compiled_code.txt
echo ===================================================== >> compiled_code.txt
echo. >> compiled_code.txt

:: Memory Bank files
echo Processing Memory Bank files...
echo ===================================================== >> compiled_code.txt
echo SECTION: MEMORY BANK >> compiled_code.txt
echo ===================================================== >> compiled_code.txt
echo. >> compiled_code.txt
for %%F in ("memory bank\*.md") do (
  echo Processing %%F...
  echo ----------------------------------------------------- >> compiled_code.txt
  echo FILE: %%F >> compiled_code.txt
  echo ----------------------------------------------------- >> compiled_code.txt
  echo. >> compiled_code.txt
  type "%%F" >> compiled_code.txt
  echo. >> compiled_code.txt
  echo. >> compiled_code.txt
)

:: Server.js file
echo Processing server.js...
echo ===================================================== >> compiled_code.txt
echo FILE: server.js >> compiled_code.txt
echo ===================================================== >> compiled_code.txt
echo. >> compiled_code.txt
type "server.js" >> compiled_code.txt
echo. >> compiled_code.txt
echo. >> compiled_code.txt

:: Client HTML files
for %%F in (client\*.html) do (
  echo Processing client\%%~nxF...
  echo ===================================================== >> compiled_code.txt
  echo FILE: client\%%~nxF >> compiled_code.txt
  echo ===================================================== >> compiled_code.txt
  echo. >> compiled_code.txt
  type "client\%%~nxF" >> compiled_code.txt
  echo. >> compiled_code.txt
  echo. >> compiled_code.txt
)

:: Client CSS files
for %%F in (client\css\*.css) do (
  echo Processing client\css\%%~nxF...
  echo ===================================================== >> compiled_code.txt
  echo FILE: client\css\%%~nxF >> compiled_code.txt
  echo ===================================================== >> compiled_code.txt
  echo. >> compiled_code.txt
  type "client\%%F" >> compiled_code.txt
  echo. >> compiled_code.txt
  echo. >> compiled_code.txt
)

:: Client JavaScript files
for %%F in (client\js\*.js) do (
  echo Processing client\js\%%~nxF...
  echo ===================================================== >> compiled_code.txt
  echo FILE: client\js\%%~nxF >> compiled_code.txt
  echo ===================================================== >> compiled_code.txt
  echo. >> compiled_code.txt
  type "client\%%F" >> compiled_code.txt
  echo. >> compiled_code.txt
  echo. >> compiled_code.txt
)

echo Compilation complete!
echo The updated compiled_code.txt file now contains all code from the project.
echo.

pause
