@echo off
title VoiceOS Controller Setup
echo ============================================
echo   VoiceOS Controller - Setup
echo ============================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed.
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

python -c "import sys; exit(0 if sys.version_info >= (3,10) else 1)"
if %errorlevel% neq 0 (
    echo [ERROR] Python 3.10 or later is required.
    python --version
    pause
    exit /b 1
)

echo [OK] Python
python --version

REM Create virtual environment
if not exist venv (
    echo.
    echo Creating virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment already exists
)

REM Activate virtual environment
echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment.
    pause
    exit /b 1
)
echo [OK] Virtual environment activated

REM Upgrade pip
echo.
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install pyaudio
echo.
echo Installing pyaudio...
pip install pyaudio >nul 2>&1
if %errorlevel% neq 0 (
    echo pyaudio direct install failed. Trying pipwin...
    pip install pipwin >nul 2>&1
    if %errorlevel% neq 0 (
        echo [WARNING] pipwin install failed.
        echo To install pyaudio manually, run:
        echo   pip install pipwin ^&^& pipwin install pyaudio
    ) else (
        pipwin install pyaudio
    )
) else (
    echo [OK] pyaudio installed
)

REM Install dependencies
echo.
echo Installing dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Setup complete!
echo ============================================
echo.
echo To start:
echo   1. venv\Scripts\activate
echo   2. python main.py
echo.
echo Note: The first launch will download the
echo faster-whisper model (may take a few minutes).
echo.
echo Microphone permission:
echo   Windows Settings -^> Privacy ^& Security -^> Microphone
echo   Make sure "Microphone access" is ON.
echo.
pause
