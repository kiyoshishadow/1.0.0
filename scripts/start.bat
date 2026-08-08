@echo off
echo =====================================
echo INICIAR SISTEMA SICIS
echo =====================================
echo.

cd /d "%~dp0..\frontend"
echo Preparando frontend cinematografico...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo ERROR: No se pudieron instalar las dependencias del frontend.
  pause
  exit /b 1
)
call npm run build
if errorlevel 1 (
  echo ERROR: No se pudo compilar el frontend.
  pause
  exit /b 1
)
echo.

cd /d "%~dp0..\backend"

echo Verificando dependencias...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo ERROR: No se pudieron instalar las dependencias del backend.
  pause
  exit /b 1
)
echo.

echo Inicializando esquema de base de datos...
call npm run init-db
if errorlevel 1 (
  echo ERROR: No se pudo inicializar la base de datos.
  pause
  exit /b 1
)
echo.

echo Aplicando migraciones de base de datos...
call npm run migrate
if errorlevel 1 (
  echo ERROR: No se pudieron aplicar las migraciones de la base de datos.
  pause
  exit /b 1
)
echo.

echo Deteniendo backend previo en puerto 3001...
call npm run stop >nul 2>&1
echo.

echo Iniciando backend...
start cmd /k "cd /d %~dp0..\backend && npm start"
timeout /t 3 /nobreak >nul

echo Abriendo navegador...
start "" "http://localhost:3001/"

echo.
echo =====================================
echo SISTEMA INICIADO
echo =====================================
echo.
echo Backend ejecutandose en http://localhost:3001
echo.
pause
