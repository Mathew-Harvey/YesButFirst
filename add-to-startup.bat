@echo off
REM This script adds YesButFirst to Windows startup

echo Creating YesButFirst startup entry...

REM Get the current directory
set "CURRENT_DIR=%~dp0"

REM Create a VBS script for silent startup (no console window)
echo Set WshShell = CreateObject("WScript.Shell") > "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\YesButFirst.vbs"
echo WshShell.Run """%CURRENT_DIR%node_modules\.bin\electron.cmd"" ""%CURRENT_DIR%""", 0 >> "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\YesButFirst.vbs"
echo Set WshShell = Nothing >> "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\YesButFirst.vbs"

echo.
echo YesButFirst has been added to startup!
echo It will run automatically when Windows starts.
echo.
echo To remove from startup, delete:
echo %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\YesButFirst.vbs
echo.
pause