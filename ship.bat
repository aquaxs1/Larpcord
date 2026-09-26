@echo off
setlocal EnableDelayedExpansion
title Build Larpcord

rem ====================================================================
rem  Larpcord - builds the finished Windows installer Larpcord-Setup.exe
rem  SPDX-License-Identifier: GPL-3.0-or-later
rem
rem    ship.bat           builds with the version from desktop\package.json
rem    ship.bat 1.2.3     sets the version first (like the release workflow)
rem
rem  LARPCORD_NO_PAUSE=1 suppresses the "Press any key" at the end.
rem ====================================================================

cd /d "%~dp0"
set "STEP=Start"

echo.
echo  ============================================
echo    Larpcord - build installer
echo  ============================================
echo.

rem ---- 1/5  Node.js --------------------------------------------------
set "STEP=Check Node.js"
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js was not found.
    echo           Install Node.js 22 or newer: https://nodejs.org
    goto :fail
)
set "NODEMAJOR="
for /f "tokens=1 delims=." %%V in ('node -v') do set "NODEMAJOR=%%V"
set "NODEMAJOR=!NODEMAJOR:v=!"
if !NODEMAJOR! LSS 22 (
    echo  [ERROR] Node.js !NODEMAJOR! is too old, 22 or newer is required.
    goto :fail
)
echo  [1/5] Node.js v!NODEMAJOR!

rem ---- 2/5  Sources complete? ----------------------------------------
set "STEP=Check sources"
set "MISSING=0"
where git >nul 2>&1
if not errorlevel 1 (
    git rev-parse --git-dir >nul 2>&1
    if not errorlevel 1 (
        git ls-files -d > "%TEMP%\larpcord-missing.txt" 2>nul
        for /f %%C in ('find /c /v "" ^< "%TEMP%\larpcord-missing.txt"') do set "MISSING=%%C"
    )
)
if !MISSING! GTR 0 (
    echo  [ERROR] !MISSING! committed files are missing from the working tree.
    echo           Restore them with:   git restore .
    echo           List of missing files: %TEMP%\larpcord-missing.txt
    goto :fail
)
if not exist "core\src\plugins\larpCore\index.tsx" (
    echo  [ERROR] core\src\plugins\larpCore\index.tsx is missing - repo incomplete.
    goto :fail
)
if not exist "desktop\src\main\index.ts" (
    echo  [ERROR] desktop\src\main\index.ts is missing - repo incomplete.
    goto :fail
)
echo  [2/5] Sources complete

rem ---- 3/5  pnpm -----------------------------------------------------
set "STEP=Provide pnpm"
set "COREPACK_ENABLE_DOWNLOAD_PROMPT=0"
where pnpm >nul 2>&1
if errorlevel 1 (
    where corepack >nul 2>&1
    if errorlevel 1 (
        echo  [ERROR] Neither pnpm nor corepack found.
        echo           Run once:   npm install -g pnpm@11.9.0
        goto :fail
    )
    rem Small wrapper so scripts\install.mjs and scripts\build.mjs find "pnpm" too
    set "SHIM=%TEMP%\larpcord-pnpm"
    if not exist "!SHIM!" mkdir "!SHIM!"
    > "!SHIM!\pnpm.cmd" echo @echo off
    >> "!SHIM!\pnpm.cmd" echo corepack pnpm@11.9.0 %%*
    set "PATH=!SHIM!;%PATH%"
)
set "PNPMV="
for /f "delims=" %%V in ('pnpm --version 2^>nul') do set "PNPMV=%%V"
if not defined PNPMV (
    echo  [ERROR] pnpm could not be started.
    goto :fail
)
echo  [3/5] pnpm v!PNPMV!

rem ---- optional: version from the argument --------------------------
if not "%~1"=="" (
    set "STEP=Set version"
    node scripts\set-version.mjs %~1
    if errorlevel 1 goto :fail
)

rem ---- 4/5  Dependencies ---------------------------------------------
set "STEP=Install dependencies"
echo.
echo  [4/5] Installing dependencies - the first time this takes a few minutes
echo.
call pnpm install --frozen-lockfile
if errorlevel 1 (
    echo.
    echo  [ERROR] pnpm install failed.
    goto :fail
)

rem ---- 5/5  Build and package ----------------------------------------
set "STEP=Build core and desktop, package installer"
echo.
echo  [5/5] Building core, copying it into the app, building desktop, packaging installer
echo.
call pnpm package
if errorlevel 1 (
    echo.
    echo  [ERROR] Build or electron-builder failed.
    goto :fail
)

rem ---- Result --------------------------------------------------------
set "STEP=Check result"
set "EXE=%CD%\desktop\dist\Larpcord-Setup.exe"
if not exist "!EXE!" (
    echo  [ERROR] The installer was not created:
    echo           !EXE!
    goto :fail
)
set "SIZEMB=0"
for %%F in ("!EXE!") do set /a SIZEMB=%%~zF / 1048576

echo.
echo  ============================================
echo    Done - Larpcord-Setup.exe ^(!SIZEMB! MB^)
echo  ============================================
echo    Installer : !EXE!
echo    No setup : %CD%\desktop\dist\win-unpacked\larpcord.exe
echo.
if not "%LARPCORD_NO_PAUSE%"=="1" pause
exit /b 0

:fail
echo.
echo  Aborted at: !STEP!
echo.
if not "%LARPCORD_NO_PAUSE%"=="1" pause
exit /b 1
