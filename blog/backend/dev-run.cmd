@echo off
rem ============================================================
rem  dev-run.cmd - one-click dev launcher (auto-select JDK 25)
rem  The project requires Java 25. If the global JAVA_HOME points
rem  to JDK 8, spring-boot-maven-plugin fails to load with
rem  UnsupportedClassVersionError (class file version 61.0 vs 52.0).
rem  This script prefers JDK 25 without touching global settings.
rem  Usage: double-click, or run "dev-run.cmd" in a terminal.
rem ============================================================
setlocal

set "JDK25=C:\Program Files\Java\jdk-25"

if exist "%JDK25%\bin\java.exe" (
    set "JAVA_HOME=%JDK25%"
    echo [dev-run] JAVA_HOME switched to JDK 25: %JDK25%
) else (
    if "%JAVA_HOME%"=="" (
        echo [dev-run] [ERROR] JDK 25 not found and JAVA_HOME is empty.
        echo            Install JDK 25 or set JAVA_HOME manually.
        exit /b 1
    )
    echo [dev-run] Using existing JAVA_HOME: %JAVA_HOME%
)

rem Start backend (H2 in-memory DB + seed data), port 8080
call mvnw.cmd spring-boot:run %*

endlocal
