@echo off
rem 어드민 로컬 시험: http://localhost:5550/admin
rem  - 접수 DB·방문 집계는 이 폴더의 .data\ (git 제외), 사이트 내용을 저장하면 이 폴더 파일을 바로 고치고 다시 빌드
rem  - 계정은 저장소 밖 ..\관리자\admin-users.json (node tools\admin\make-users.mjs 로 만듦)
rem  - 경로에 & 가 있어도 되도록 set "이름=값" 으로 감싼다. 5540 은 미리보기 서버가 쓰므로 5550
chcp 65001 >nul
cd /d "%~dp0.."
set "ADMIN_STORE=local"
set "ADMIN_USERS_FILE=%~dp0..\..\관리자\admin-users.json"
set "STATS_DIR=%~dp0..\.data\analytics"
set "API_BASE=self"
set "ADMIN_LOCAL_PREVIEW=http://localhost:5550/"
if not exist "%ADMIN_USERS_FILE%" (echo 계정 파일이 없습니다: %ADMIN_USERS_FILE% & echo node tools\admin\make-users.mjs 를 먼저 실행하세요 & pause & exit /b 1)
node build.mjs --preview http://localhost:5550/
if errorlevel 1 (echo 빌드 오류 & pause & exit /b 1)
start "" http://localhost:5550/admin
node tools\serve.mjs 5550
pause
