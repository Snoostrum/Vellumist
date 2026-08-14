@echo off
rem ============================================================
rem  start-frontend.cmd - one-click frontend dev server (port 8081)
rem  Requires Node.js. Serves blog/frontend at
rem  http://localhost:8081  (backend should run on 8080 via dev-run.cmd)
rem  NOTE: do NOT open the html files directly (file:// protocol
rem  breaks API calls). Always access through http://localhost:8081
rem ============================================================
setlocal
cd /d "%~dp0"
node serve.js 8081 "%~dp0frontend"
endlocal
