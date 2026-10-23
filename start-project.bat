@echo off
title MediChain Consortium Organ Traceability Network
echo ======================================================================
echo   STARTING MEDILAYER CONSORTIUM BLOCKCHAIN NETWORK (PORT 5000 & 5173)
echo ======================================================================
echo.

echo Starting Backend Node Engine on http://localhost:5000 ...
start "MediChain Backend Engine" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 2 >nul

echo Starting Frontend Vite Portal on http://localhost:5173 ...
start "MediChain Frontend Portal" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ======================================================================
echo   Both services started successfully!
echo   - Backend:  http://localhost:5000
echo   - Frontend: http://localhost:5173
echo ======================================================================
pause
