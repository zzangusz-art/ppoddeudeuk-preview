@echo off
rem 어드민 로컬 시험: 접수 DB·계정은 ..\.data\ (git 제외), 사이트 내용 저장은 이 폴더 파일을 직접 고치고 바로 다시 빌드
rem 계정 파일은 저장소 밖 ..\..\관리자\admin-users.json (node tools\admin\make-users.mjs 로 만듦)
chcp 65001 >nul
cd /d "%~dp0.."
set ADMIN_STORE=local
set ADMIN_USERS_FILE=%~dp0..\..\관리자\admin-users.json
set STATS_DIR=%~dp0..\.data\analytics
set API_BASE=self
node build.mjs --preview http://localhost:5540/
if errorlevel 1 (echo 빌드 오류 & pause & exit /b 1)
start "" http://localhost:5540/admin
node tools\serve.mjs 5540
