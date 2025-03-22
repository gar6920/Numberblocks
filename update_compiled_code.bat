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

set /a totalFiles=0

:: Process all text files recursively
for /R %%F in (*.js, *.html, *.css, *.md, *.json, *.bat, *.txt) do (
    set "filePath=%%F"
    set "fileName=%%~nxF"
    
    :: Skip compiled_code.txt and node_modules
    echo !filePath! | findstr /i /c:"compiled_code.txt" /c:"node_modules" /c:"\.git\" > nul
    if errorlevel 1 (
        echo Processing !filePath!...
        echo ===================================================== >> compiled_code.txt
        echo FILE: !filePath! >> compiled_code.txt
        echo ===================================================== >> compiled_code.txt
        echo. >> compiled_code.txt
        type "!filePath!" >> compiled_code.txt
        echo. >> compiled_code.txt
        echo. >> compiled_code.txt
        set /a totalFiles=totalFiles+1
    )
)

echo.
echo Compilation complete! Processed !totalFiles! files.
echo The updated compiled_code.txt file now contains all code from the project.
echo.

pause
