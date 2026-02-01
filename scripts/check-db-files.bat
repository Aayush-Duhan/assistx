@echo off
REM Pre-commit hook to prevent database files from being committed
REM This script checks for SQLite database files that should not be in git

for /f "delims=" %%f in ('git diff --cached --name-only --diff-filter^=ACM') do (
    echo %%f | findstr /E "\.db \.db-shm \.db-wal" >nul
    if !errorlevel! == 0 (
        echo ERROR: Database file detected in commit: %%f
        echo Database files should not be committed. Please add them to .gitignore.
        exit /b 1
    )
)

exit /b 0
