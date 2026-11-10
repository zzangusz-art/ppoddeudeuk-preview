@echo off
chcp 65001 >nul
cd /d "%~dp0"
node build.mjs --preview http://localhost:5540/
if errorlevel 1 (echo 빌드 오류 - 위 메시지를 확인하세요 & pause & exit /b 1)
start "" http://localhost:5540/
node tools\serve.mjs 5540
