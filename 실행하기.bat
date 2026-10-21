@echo off
chcp 65001 > nul
title Link & QR Studio 웹 앱 실행기
echo ======================================================================
echo   Link & QR Studio - QR코드 생성 & URL 단축 스마트 웹 앱
echo ======================================================================
echo.
echo [1] 로컬 웹 서버를 구동합니다 (포트: 8088)
echo [2] 기본 웹 브라우저에서 메인 허브 화면을 엽니다.
echo.
echo  * 메인 허브: http://localhost:8088/
echo  * QR코드 생성기: http://localhost:8088/url2qr/index.html
echo  * URL 단축기: http://localhost:8088/urlShort/index.html
echo.
echo 종료하려면 이 창을 닫으세요.
echo ======================================================================
echo.

start "" "http://localhost:8088/"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
