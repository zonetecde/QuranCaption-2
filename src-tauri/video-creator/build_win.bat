@echo off
echo Creating the executable for Windows...

echo Installing dependencies...
pip install pillow
pip install pyinstaller
echo Dependencies installed successfully.

rem Check if PyInstaller is installed
pyinstaller --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo PyInstaller is not installed. Installing it again...
    pip install pyinstaller
)

rem Build the executable
pyinstaller --onefile video_creator.py --name video_creator

echo Executable created: dist\video_creator.exe

@REM move the executable from dist\video_creator.exe to ..\binaries\video_creator.exe
move dist\video_creator.exe ..\binaries\video_creator.exe

echo Executable moved to ..\binaries\video_creator.exe