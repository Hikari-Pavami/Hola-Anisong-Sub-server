@echo off
chcp 65001 >nul
title Đóng gói Hola Anisong Extension
color 0B

echo ======================================================================
echo             HOLA ANISONG SUB-SER - TOOL ĐÓNG GÓI PHÁT HÀNH
echo ======================================================================
echo.

set "ZIP_NAME=hola-anisong-subser-v1.1.0.zip"
set "DIST_DIR=%~dp0dist"

if exist "%DIST_DIR%" (
    rd /s /q "%DIST_DIR%" >nul 2>&1
)
mkdir "%DIST_DIR%" >nul 2>&1

echo [*] Đang nén các tệp cần thiết vào file %ZIP_NAME%...

powershell -NoProfile -Command "Compress-Archive -Path '%~dp0manifest.json', '%~dp0content.js', '%~dp0popup.html', '%~dp0popup.css', '%~dp0popup.js', '%~dp0ass-parser.js', '%~dp0version.json', '%~dp0install.bat', '%~dp0HUONG_DAN_CAI_DAT.md' -DestinationPath '%DIST_DIR%\%ZIP_NAME%' -Force"

if exist "%DIST_DIR%\%ZIP_NAME%" (
    echo.
    echo ======================================================================
    echo [THÀNH CÔNG] Đã tạo file phát hành tại:
    echo  %DIST_DIR%\%ZIP_NAME%
    echo ======================================================================
    echo File này đã sẵn sàng để gửi cho người dùng hoặc upload lên GitHub Releases!
) else (
    echo [LỖI] Đóng gói thất bại!
)

echo.
pause
