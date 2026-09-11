@echo off
echo ========================================
echo    WHAATOPRO - Automated Setup
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed.
    echo Install from: https://docs.docker.com/desktop/install/windows-install/
    echo.
    echo After installing Docker, run this script again.
    pause
    exit /b 1
)

echo [1/5] Starting Redis and PostgreSQL...
docker-compose up -d
timeout /t 5 /nobreak >nul

echo [2/5] Checking Redis...
docker exec whaatopro-redis redis-cli ping
if %errorlevel% neq 0 (
    echo [ERROR] Redis failed to start
    pause
    exit /b 1
)

echo [3/5] Checking PostgreSQL...
docker exec whaatopro-postgres pg_isready -U whaatopro
if %errorlevel% neq 0 (
    echo [ERROR] PostgreSQL failed to start
    pause
    exit /b 1
)

echo [4/5] Installing dependencies...
call npm install

echo [5/5] Setting up database...
call npx prisma generate
call npx prisma migrate dev --name init
call npx prisma db seed

echo.
echo ========================================
echo    SETUP COMPLETE!
echo ========================================
echo.
echo Run: npm run dev
echo Open: http://localhost:3000
echo.
echo Login: admin@whaatopro.com / password123
echo.
echo Meta setup: See META-SETUP.md
echo.
pause
