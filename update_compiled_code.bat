@echo off
setlocal enabledelayedexpansion

echo Creating updated compiled_code.txt file...

:: Delete the old file if it exists
if exist compiled_code.txt del compiled_code.txt

:: Create the new file with a header
echo ===================================================== > compiled_code.txt
echo 3D AI GAME PLATFORM - COMPLETE CODE COMPILATION >> compiled_code.txt
echo ===================================================== >> compiled_code.txt
echo. >> compiled_code.txt

:: Add directory structure (excluding node_modules and .git)
echo DIRECTORY STRUCTURE: >> compiled_code.txt
echo ===================================================== >> compiled_code.txt
echo Generating directory tree (excluding node_modules and .git)...
:: Use a temporary tree file to filter out node_modules and .git
tree /f /a > temp_tree.txt
:: Filter out node_modules and .git from the tree output
type temp_tree.txt | findstr /v "node_modules .git" >> compiled_code.txt
:: Clean up
del temp_tree.txt
echo. >> compiled_code.txt
echo ===================================================== >> compiled_code.txt
echo. >> compiled_code.txt
echo. >> compiled_code.txt

set /a totalFiles=0

:: Process root directory files
for %%F in (*.js, *.ts, *.jsx, *.tsx, *.html, *.css, *.scss, *.md, *.json, *.bat, *.txt, *.yaml, *.yml, *.xml, *.env*, *.config*) do (
    if /i not "%%F"=="compiled_code.txt" (
        if /i not "%%F"=="temp_tree.txt" (
            if /i not "%%F"=="server_output.tmp" (
                echo Processing %%F...
                echo ===================================================== >> compiled_code.txt
                echo FILE: %%F >> compiled_code.txt
                echo ===================================================== >> compiled_code.txt
                echo. >> compiled_code.txt
                type "%%F" >> compiled_code.txt
                echo. >> compiled_code.txt
                echo. >> compiled_code.txt
                set /a totalFiles=totalFiles+1
            )
        )
    )
)

:: Process client directory
for /R "client" %%F in (*.js, *.ts, *.jsx, *.tsx, *.html, *.css, *.scss, *.md, *.json, *.bat, *.txt, *.yaml, *.yml, *.xml, *.env*, *.config*) do (
    echo Processing %%F...
    echo ===================================================== >> compiled_code.txt
    echo FILE: %%F >> compiled_code.txt
    echo ===================================================== >> compiled_code.txt
    echo. >> compiled_code.txt
    type "%%F" >> compiled_code.txt
    echo. >> compiled_code.txt
    echo. >> compiled_code.txt
    set /a totalFiles=totalFiles+1
)

:: Process server directory
for /R "server" %%F in (*.js, *.ts, *.jsx, *.tsx, *.html, *.css, *.scss, *.md, *.json, *.bat, *.txt, *.yaml, *.yml, *.xml, *.env*, *.config*) do (
    echo Processing %%F...
    echo ===================================================== >> compiled_code.txt
    echo FILE: %%F >> compiled_code.txt
    echo ===================================================== >> compiled_code.txt
    echo. >> compiled_code.txt
    type "%%F" >> compiled_code.txt
    echo. >> compiled_code.txt
    echo. >> compiled_code.txt
    set /a totalFiles=totalFiles+1
)

:: Process memory bank directory
for /R "memory bank" %%F in (*.js, *.ts, *.jsx, *.tsx, *.html, *.css, *.scss, *.md, *.json, *.bat, *.txt, *.yaml, *.yml, *.xml, *.env*, *.config*) do (
    echo Processing %%F...
    echo ===================================================== >> compiled_code.txt
    echo FILE: %%F >> compiled_code.txt
    echo ===================================================== >> compiled_code.txt
    echo. >> compiled_code.txt
    type "%%F" >> compiled_code.txt
    echo. >> compiled_code.txt
    echo. >> compiled_code.txt
    set /a totalFiles=totalFiles+1
)

echo.
echo Compilation complete! Processed !totalFiles! files.
echo The updated compiled_code.txt file now contains all code from the project.
echo Directory structure and file contents have been saved to compiled_code.txt
echo.

pause
