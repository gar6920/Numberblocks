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

:: HTML files
for %%F in (*.html) do (
  echo Processing %%F...
  echo ===================================================== >> compiled_code.txt
  echo FILE: %%F >> compiled_code.txt
  echo ===================================================== >> compiled_code.txt
  echo. >> compiled_code.txt
  type "%%F" >> compiled_code.txt
  echo. >> compiled_code.txt
  echo. >> compiled_code.txt
)

:: CSS files
for %%F in (css\*.css) do (
  echo Processing %%F...
  echo ===================================================== >> compiled_code.txt
  echo FILE: %%F >> compiled_code.txt
  echo ===================================================== >> compiled_code.txt
  echo. >> compiled_code.txt
  type "%%F" >> compiled_code.txt
  echo. >> compiled_code.txt
  echo. >> compiled_code.txt
)

:: JavaScript files
for %%F in (js\*.js) do (
  echo Processing %%F...
  echo ===================================================== >> compiled_code.txt
  echo FILE: %%F >> compiled_code.txt
  echo ===================================================== >> compiled_code.txt
  echo. >> compiled_code.txt
  type "%%F" >> compiled_code.txt
  echo. >> compiled_code.txt
  echo. >> compiled_code.txt
)

echo Compilation complete!
echo The updated compiled_code.txt file now contains all code from the project.
echo.

pause
