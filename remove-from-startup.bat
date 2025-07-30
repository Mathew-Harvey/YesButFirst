@echo off
REM This script removes YesButFirst from Windows startup

echo Removing YesButFirst from startup...

REM Delete the VBS startup script
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\YesButFirst.vbs" 2>nul

if %errorlevel% == 0 (
    echo YesButFirst has been removed from startup!
) else (
    echo YesButFirst startup entry not found or already removed.
)

echo.
pause