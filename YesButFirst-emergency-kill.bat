@echo off
echo Killing all YesButFirst/Electron processes...
echo.

REM Kill electron processes
taskkill /F /IM electron.exe 2>nul
taskkill /F /IM "YesButFirst.exe" 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq npm" 2>nul

echo.
echo All YesButFirst processes have been terminated.
echo You can now safely restart the app.
echo.
pause