@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1" -SkillName daily-work-report
set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo ====================================
pause
exit /b %EXIT_CODE%
