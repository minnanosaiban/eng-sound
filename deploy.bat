@echo off
setlocal

rem ============================================================
rem  eng-sound deploy (GitHub Pages, built by GitHub Actions)
rem  Double-click after changes to publish the site.
rem
rem  Steps:
rem    1. Check typecheck / test / build locally. Stops here on failure.
rem    2. Commit and push to GitHub (main).
rem    3. GitHub Actions builds and publishes the site (about 30 seconds).
rem       If the gh command is available, this script waits for the result.
rem
rem  First-time setup (run once in this folder):
rem    npm install
rem
rem  Site:    https://minnanosaiban.github.io/eng-sound/
rem  Actions: https://github.com/minnanosaiban/eng-sound/actions
rem ============================================================

echo === Deploy eng-sound to GitHub Pages ===
cd /d "%~dp0"
echo Current: %CD%

if not exist "node_modules" (
    echo [ERROR] node_modules was not found. Run "npm install" once in this folder.
    pause
    exit /b 1
)

echo === Typecheck ===
call npm run typecheck
if %errorlevel% neq 0 goto :fail

echo === Test ===
call npm run test
if %errorlevel% neq 0 goto :fail

echo === Build ===
call npm run build
if %errorlevel% neq 0 goto :fail

echo === Commit ^& Push to GitHub (main) ===
git add .
git commit -m "Update eng-sound" || echo No changes to commit
git push -u origin main
if %errorlevel% neq 0 (
    echo [ERROR] Git push failed.
    pause
    exit /b 1
)

where gh >nul 2>nul
if %errorlevel% equ 0 (
    echo === Wait for GitHub Actions ===
    timeout /t 8 /nobreak >nul
    gh run watch --exit-status --repo minnanosaiban/eng-sound
    if errorlevel 1 echo [WARN] The Actions run did not succeed. See the Actions page above.
)

echo === Done ===
echo https://minnanosaiban.github.io/eng-sound/
pause
exit /b 0

:fail
echo [ERROR] Check failed. Nothing was pushed.
pause
exit /b 1
