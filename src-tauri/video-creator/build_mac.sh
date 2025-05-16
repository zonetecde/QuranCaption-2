#!/bin/bash
echo "Creating the executable for macOS..."

echo "Installing dependencies..."
pip install pillow
pip install pyinstaller
echo "Dependencies installed successfully."

# Check if PyInstaller is installed
if ! command -v pyinstaller &> /dev/null; then
    echo "PyInstaller is not installed. Installing it now..."
    pip install pyinstaller
fi

# Build the executable
pyinstaller --onefile video_creator.py --name video_creator

echo "Executable created: dist/video_creator"

# Move the executable from dist/video_creator to ../binaries/video_creator
mv dist/video_creator ../binaries/video_creator
echo "Executable moved to ../binaries/video_creator"
