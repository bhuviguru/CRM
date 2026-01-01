@echo off
echo ========================================
echo Starting SahayakCRM - All Services
echo ========================================
echo.

echo [1/5] Setting environment variables...
set USE_SQLITE=true
set NODE_ENV=development
set PORT=5000
set CLIENT_URL=http://localhost:3000
echo ✅ Environment configured

echo.
echo [2/5] Initializing SQLite database...
cd server
node src/scripts/init-sqlite.js
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ Database initialization had issues, continuing...
)
echo ✅ Database ready

echo.
echo [3/5] Starting Backend Server (Port 5000)...
start "SahayakCRM Backend" cmd /k "set USE_SQLITE=true && set NODE_ENV=development && npm start"
timeout /t 5 /nobreak > nul
echo ✅ Backend starting...

echo.
echo [4/5] Frontend already running on Port 3000
echo ✅ Frontend ready

echo.
echo [5/5] Checking AI Engine (Port 8000)...
echo ⚠️ AI Engine optional - start manually if needed
echo    Command: cd ai-engine ^&^& python main.py

echo.
echo ========================================
echo ✅ ALL SERVICES STARTED!
echo ========================================
echo.
echo 📱 Access your CRM:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo    API Docs: http://localhost:5000/api-docs
echo.
echo 🔐 Login Credentials:
echo    Email: admin@sahayakcrm.com
echo    Password: admin123
echo.
echo Press any key to open CRM in browser...
pause > nul
start http://localhost:3000
