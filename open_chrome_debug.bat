@echo off
setlocal

set "CHROME_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "DEBUG_DIR=%LOCALAPPDATA%\Google\Chrome\ticket-sniper-debug"

if not exist "%CHROME_EXE%" (
  set "CHROME_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

if not exist "%CHROME_EXE%" (
  echo Chrome tidak ditemukan di path default.
  echo Edit CHROME_EXE di open_chrome_debug.bat.
  pause
  exit /b 1
)

echo Membuka Chrome dengan remote debugging di port 9222...
echo UserData: %DEBUG_DIR%
start "" "%CHROME_EXE%" --remote-debugging-port=9222 --user-data-dir="%DEBUG_DIR%" "https://widget.loket.com/widget/5601fcaa078034c8ffac"

echo.
echo Setelah tab Loket terbuka, jalankan:
echo   node watch_chrome_tab.js
echo.
pause
