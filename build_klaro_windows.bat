@echo off
echo 🚀 Starting Klaro Build Pipeline (Windows)...

:: 1. Build
echo 📦 Building Application...
call npm run tauri build

:: 2. Deliver
:: Tauri usually outputs to src-tauri/target/release/bundle/msi or nsis
set TARGET_DIR=src-tauri\target\release\bundle\msi
for %%f in (%TARGET_DIR%\*.msi) do set INSTALLER=%%f

if exist "%INSTALLER%" (
    copy "%INSTALLER%" "%USERPROFILE%\Desktop\"
    echo ✅ Build Success! Installer copied to Desktop.
) else (
    echo ❌ Build Failed or Installer not found.
    echo    Check src-tauri/target/release/bundle/ for output.
)

pause
