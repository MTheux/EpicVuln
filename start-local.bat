@echo off
REM ============================================
REM EpicVuln - Start without Docker (Windows)
REM Requires: Node.js 20+, PostgreSQL
REM ============================================

echo =========================================
echo   EpicVuln - Local Setup (sem Docker)
echo =========================================

REM Check Node
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Node.js nao encontrado. Instale Node.js 20+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo Node.js: %%i

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] npm nao encontrado.
    pause
    exit /b 1
)

REM Database config - adjust these for your environment
if "%DB_USER%"=="" set DB_USER=postgres
if "%DB_PASS%"=="" set DB_PASS=postgres
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432
if "%DB_NAME%"=="" set DB_NAME=epicvuln

set DATABASE_URL=postgresql://%DB_USER%:%DB_PASS%@%DB_HOST%:%DB_PORT%/%DB_NAME%?schema=public

echo.
echo Database: %DB_HOST%:%DB_PORT%/%DB_NAME%
echo User: %DB_USER%
echo.

REM ---- Backend Setup ----
echo [1/5] Instalando dependencias do backend...
cd backend
call npm install

REM Create .env for local
(
echo DATABASE_URL="%DATABASE_URL%"
echo JWT_SECRET="epicvuln-secret-key-local"
echo JWT_EXPIRES_IN="8h"
echo JWT_REFRESH_SECRET="epicvuln-refresh-secret-local"
echo JWT_REFRESH_EXPIRES_IN="7d"
echo PORT=9001
echo NODE_ENV=development
echo FRONTEND_URL=http://localhost:9000
echo UPLOAD_MAX_SIZE_MB=10
echo UPLOAD_DIR=./uploads
) > .env

echo [2/5] Configurando banco de dados...
call npx prisma generate
call npx prisma db push --accept-data-loss
call npx prisma db seed 2>nul

echo [3/5] Iniciando backend na porta 9001...
start "EpicVuln Backend" cmd /c "npx tsx src/index.ts"

cd ..

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM ---- Frontend Setup ----
echo [4/5] Instalando dependencias do frontend...
call npm install

echo [5/5] Iniciando frontend na porta 9000...
set NEXT_PUBLIC_API_URL=http://localhost:9001
start "EpicVuln Frontend" cmd /c "npx next dev -p 9000"

echo.
echo =========================================
echo   EpicVuln rodando!
echo =========================================
echo   Frontend: http://localhost:9000
echo   Backend:  http://localhost:9001
echo   Login:    admin@unisys.com / admin@123
echo.
echo   Para parar: feche as janelas do Backend e Frontend
echo =========================================
echo.
pause
