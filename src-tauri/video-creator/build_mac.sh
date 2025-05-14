#!/bin/bash
echo "Creating the executable for macOS..."

# Check if PyInstaller is installed
if ! command -v pyinstaller &> /dev/null; then
    echo "PyInstaller is not installed. Installing it now..."
    pip install pyinstaller
fi

# Build the executable
pyinstaller --onefile video_creator.py --name video_creator

echo "Executable created: dist/video_creator"