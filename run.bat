@echo off
REM Start the sim8085 web development server

cd /d "%~dp0web" || exit /b 1
npm run dev
