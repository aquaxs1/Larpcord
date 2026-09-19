@echo off
setlocal EnableDelayedExpansion
title Larpcord bauen

rem ====================================================================
rem  Larpcord - baut den fertigen Windows-Installer Larpcord-Setup.exe
rem  SPDX-License-Identifier: GPL-3.0-or-later
rem
rem    ship.bat           baut mit der Version aus desktop\package.json
rem    ship.bat 1.2.3     setzt vorher die Version (wie der Release-Workflow)
rem
rem  LARPCORD_NO_PAUSE=1 unterdrueckt das "Beliebige Taste druecken" am Ende.
rem ====================================================================

cd /d "%~dp0"
set "STEP=Start"

echo.
echo  ============================================
echo    Larpcord - Installer bauen
echo  ============================================
echo.

rem ---- 1/5  Node.js --------------------------------------------------
set "STEP=Node.js pruefen"
where node >nul 2>&1
if errorlevel 1 (
    echo  [FEHLER] Node.js wurde nicht gefunden.
    echo           Node.js 22 oder neuer installieren: https://nodejs.org
    goto :fail
)
set "NODEMAJOR="
for /f "tokens=1 delims=." %%V in ('node -v') do set "NODEMAJOR=%%V"
set "NODEMAJOR=!NODEMAJOR:v=!"
if !NODEMAJOR! LSS 22 (
    echo  [FEHLER] Node.js !NODEMAJOR! ist zu alt, benoetigt wird 22 oder neuer.
    goto :fail
)
echo  [1/5] Node.js v!NODEMAJOR!

rem ---- 2/5  Quellen vollstaendig? ------------------------------------
set "STEP=Quellen pruefen"
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
    echo  [FEHLER] !MISSING! eingecheckte Dateien fehlen im Arbeitsverzeichnis.
    echo           Wiederherstellen mit:   git restore .
    echo           Liste der fehlenden Dateien: %TEMP%\larpcord-missing.txt
    goto :fail
)
if not exist "core\src\plugins\larpCore\index.tsx" (
    echo  [FEHLER] core\src\plugins\larpCore\index.tsx fehlt - Repo unvollstaendig.
    goto :fail
)
if not exist "desktop\src\main\index.ts" (
    echo  [FEHLER] desktop\src\main\index.ts fehlt - Repo unvollstaendig.
    goto :fail
)
echo  [2/5] Quellen vollstaendig

rem ---- 3/5  pnpm -----------------------------------------------------
set "STEP=pnpm bereitstellen"
set "COREPACK_ENABLE_DOWNLOAD_PROMPT=0"
where pnpm >nul 2>&1
if errorlevel 1 (
    where corepack >nul 2>&1
    if errorlevel 1 (
        echo  [FEHLER] Weder pnpm noch corepack gefunden.
        echo           Einmalig ausfuehren:   npm install -g pnpm@11.9.0
        goto :fail
    )
    rem Kleiner Wrapper, damit auch scripts\install.mjs und scripts\build.mjs "pnpm" finden
    set "SHIM=%TEMP%\larpcord-pnpm"
    if not exist "!SHIM!" mkdir "!SHIM!"
    > "!SHIM!\pnpm.cmd" echo @echo off
    >> "!SHIM!\pnpm.cmd" echo corepack pnpm@11.9.0 %%*
    set "PATH=!SHIM!;%PATH%"
)
set "PNPMV="
for /f "delims=" %%V in ('pnpm --version 2^>nul') do set "PNPMV=%%V"
if not defined PNPMV (
    echo  [FEHLER] pnpm liess sich nicht starten.
    goto :fail
)
echo  [3/5] pnpm v!PNPMV!

rem ---- optional: Version aus dem Argument ----------------------------
if not "%~1"=="" (
    set "STEP=Version setzen"
    node scripts\set-version.mjs %~1
    if errorlevel 1 goto :fail
)

rem ---- 4/5  Abhaengigkeiten ------------------------------------------
set "STEP=Abhaengigkeiten installieren"
echo.
echo  [4/5] Abhaengigkeiten installieren - beim ersten Mal dauert das einige Minuten
echo.
call pnpm install --frozen-lockfile
if errorlevel 1 (
    echo.
    echo  [FEHLER] pnpm install ist fehlgeschlagen.
    goto :fail
)

rem ---- 5/5  Bauen und paketieren -------------------------------------
set "STEP=Core und Desktop bauen, Installer paketieren"
echo.
echo  [5/5] Core bauen, in die App kopieren, Desktop bauen, Installer paketieren
echo.
call pnpm package
if errorlevel 1 (
    echo.
    echo  [FEHLER] Build bzw. electron-builder ist fehlgeschlagen.
    goto :fail
)

rem ---- Ergebnis ------------------------------------------------------
set "STEP=Ergebnis pruefen"
set "EXE=%CD%\desktop\dist\Larpcord-Setup.exe"
if not exist "!EXE!" (
    echo  [FEHLER] Der Installer wurde nicht erzeugt:
    echo           !EXE!
    goto :fail
)
set "SIZEMB=0"
for %%F in ("!EXE!") do set /a SIZEMB=%%~zF / 1048576

echo.
echo  ============================================
echo    Fertig - Larpcord-Setup.exe ^(!SIZEMB! MB^)
echo  ============================================
echo    Installer : !EXE!
echo    Ohne Setup: %CD%\desktop\dist\win-unpacked\larpcord.exe
echo.
if not "%LARPCORD_NO_PAUSE%"=="1" pause
exit /b 0

:fail
echo.
echo  Abgebrochen bei: !STEP!
echo.
if not "%LARPCORD_NO_PAUSE%"=="1" pause
exit /b 1
