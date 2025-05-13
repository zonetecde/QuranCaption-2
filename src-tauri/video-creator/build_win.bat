@echo off
echo Creating the executable for Windows...

rem Check if PyInstaller is installed
pyinstaller --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo PyInstaller is not installed. Installing it now...
    pip install pyinstaller
)

rem Build the executable
pyinstaller --onefile imgs_to_vid.py --name video_creator

echo Executable created: dist\video_creator.exe