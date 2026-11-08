@echo off
chcp 65001 >nul
title Cài đặt Hola Anisong Sub-Ser Extension
color 0A

echo ======================================================================
echo             HOLA ANISONG SUB-SER - TRINH CAI DAT
echo ======================================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\HolaAnisongSubSer"

echo [*] Khoi tao thu muc:
echo     "%TARGET_DIR%"
echo.

if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%" >nul 2>&1
)

:: cai
echo [*] Dang cai dat...
copy /Y "%~dp0manifest.json" "%TARGET_DIR%\" >nul
copy /Y "%~dp0content.js" "%TARGET_DIR%\" >nul
copy /Y "%~dp0popup.html" "%TARGET_DIR%\" >nul
copy /Y "%~dp0popup.css" "%TARGET_DIR%\" >nul
copy /Y "%~dp0popup.js" "%TARGET_DIR%\" >nul
copy /Y "%~dp0ass-parser.js" "%TARGET_DIR%\" >nul
if exist "%~dp0version.json" copy /Y "%~dp0version.json" "%TARGET_DIR%\" >nul

echo [OK] Cai dat thanh cong.
echo.

:: Clipboard auto
powershell -NoProfile -Command "Set-Clipboard -Value '%TARGET_DIR%'" >nul 2>&1
if errorlevel 1 (
    echo %TARGET_DIR%| clip
)

echo ======================================================================
echo CAI DAT THANH CONG. DA LUU DUONG DAN VAO BO NHO TAM.
echo ======================================================================
echo.
echo CAC BUOC TIEP THEO:
echo   1. Bat "Che do cho nha phat trien" (Developer mode) o goc tren ben phai.
echo   2. Nhan "Tai tien ich da giai nen" (Load unpacked) o goc trai
echo      --^> Nhan Ctrl + V (de dan duong dan) roi bam "Select Folder"!
echo ======================================================================
echo.
echo Ban muon mo trang tien ich tren trinh duyet nao?
echo   [1] Google Chrome
echo   [2] Microsoft Edge
echo   [3] Brave Browser
echo   [4] Coc Coc
echo   [5] Tu mo sau
echo.

set /p userChoice="Nhap lua chon (1-5): "

if "%userChoice%"=="1" (
    start chrome "chrome://extensions"
) else if "%userChoice%"=="2" (
    start msedge "edge://extensions"
) else if "%userChoice%"=="3" (
    start brave "brave://extensions"
) else if "%userChoice%"=="4" (
    start coccoc "coccoc://extensions"
) else (
    echo Ban co the tu mo trang quan li tien ich bat cu luc nao.
)

echo.
echo ====================================================================================
echo  Lưu ý: Neu sau nay co ban cap nhat moi, chi can tai ve, giai nen, chay lai file nay
echo  va bam nut tai lai (reload) tren trang tien ich.
echo ====================================================================================
echo Nhan phim bat ki de thoat.
pause >nul
