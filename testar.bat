@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Longyu - servidor de teste

echo.
echo   ===========================================
echo     Longyu - ambiente de teste local
echo   ===========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  echo Instale a versao LTS em https://nodejs.org e rode de novo.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Primeira vez: instalando dependencias ^(pode demorar 1-2 min^)...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha no npm install. Veja a mensagem acima.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando o servidor e abrindo o navegador...
echo Endereco: http://localhost:5173
echo.
echo Deixe esta janela aberta. Para parar: feche a janela ou Ctrl+C.
echo.

call npm run dev -- --open

echo.
echo Servidor encerrado.
pause
