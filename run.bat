@echo off
echo ========================================================
echo Starting FINAL2 Fullstack Project
echo ========================================================

REM Add Node.js to PATH if VS Node is present
if exist "C:\Program Files\Microsoft Visual Studio\18\Insiders\MSBuild\Microsoft\VisualStudio\NodeJs" (
    set "PATH=C:\Program Files\Microsoft Visual Studio\18\Insiders\MSBuild\Microsoft\VisualStudio\NodeJs;%PATH%"
)

echo Starting Backend API on http://127.0.0.1:8000...
start "FINAL2 Backend" cmd /k "cd /d %~dp0backend && ..\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Frontend on http://localhost:3000...
start "FINAL2 Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 >nul
start http://localhost:3000
echo Servers launched!
pause

