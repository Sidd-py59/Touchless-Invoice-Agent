@echo off
setlocal enabledelayedexpansion

REM Project runner for TIA: stops old servers on reserved ports and starts backend + frontend.
set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend
set BACKEND_PORT=8000
set FRONTEND_PORT=5173

echo ==================================================
echo Pre-flight checks (Firebase Authentication)...
echo ==================================================
if not exist "%BACKEND_DIR%\serviceAccountKey.json" (
    echo [WARNING] backend\serviceAccountKey.json is missing.
    echo           The API will reject ALL requests unless AUTH_ENABLED=false in backend\.env.
    echo           Get it: Firebase Console ^> Project settings ^> Service accounts ^> Generate new private key.
)
if not exist "%FRONTEND_DIR%\.env" (
    echo [WARNING] frontend\.env is missing - the login page cannot reach Firebase.
    echo           Copy frontend\.env.example to frontend\.env and fill in the Firebase web keys.
)
echo.
echo ==================================================
echo Stopping any processes on ports %BACKEND_PORT% and %FRONTEND_PORT%...
echo ==================================================
for %%P in (%BACKEND_PORT% %FRONTEND_PORT%) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr /r /c:":%%P "') do (
        echo Killing process on port %%P, PID=%%A
        taskkill /F /PID %%A >nul 2>&1
    )
)
echo.
echo Starting backend on port %BACKEND_PORT%...
REM uv run syncs the venv first, so new dependencies (e.g. firebase-admin) are always installed.
start "TIA Backend" cmd /k "cd /d "%BACKEND_DIR%" && uv run uvicorn app.main:app --reload --port %BACKEND_PORT%"
echo Starting frontend on port %FRONTEND_PORT%...
start "TIA Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"
echo.
echo Backend and frontend startup commands launched.
echo --------------------------------------------------
echo Backend URL:  http://localhost:%BACKEND_PORT%
echo Frontend URL: http://localhost:%FRONTEND_PORT%
echo Sign in at:   http://localhost:%FRONTEND_PORT%/login  (accounts: client_accounts.txt)
echo --------------------------------------------------
echo Ensure backend .env values are set before use.
endlocal
