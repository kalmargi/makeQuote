@echo off
cd /d "%~dp0"
set CSC_IDENTITY_AUTO_DISCOVERY=false
echo Installing build tools...
call npm install
if errorlevel 1 goto fail
echo Building installer...
call npx electron-builder --win nsis
if errorlevel 1 goto fail
echo.
echo SUCCESS. Copy only the Setup exe from the dist folder to the PCs.
goto end
:fail
echo.
echo BUILD FAILED. Read the messages above.
:end
pause
