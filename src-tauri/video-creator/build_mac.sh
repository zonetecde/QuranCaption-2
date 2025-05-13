#!/bin/bash
echo "Creating the executable for macOS..."

# Create ffmpeg_bin directory if it doesn't exist
mkdir -p ffmpeg_bin

# Download and extract FFmpeg for macOS if necessary
if [ ! -f ffmpeg_bin/ffmpeg ] || [ ! -f ffmpeg_bin/ffprobe ]; then
    echo "Downloading FFmpeg for macOS..."
    
    # Download using better-formatted links for FFmpeg static builds
    curl -L https://evermeet.cx/ffmpeg/ffmpeg-7.0.zip -o ffmpeg.zip
    curl -L https://evermeet.cx/ffmpeg/ffprobe-7.0.zip -o ffprobe.zip
    
    # Check if downloads were successful
    if [ -f ffmpeg.zip ] && [ -f ffprobe.zip ]; then
        unzip -o ffmpeg.zip -d ffmpeg_bin
        unzip -o ffprobe.zip -d ffmpeg_bin
        chmod +x ffmpeg_bin/ffmpeg
        chmod +x ffmpeg_bin/ffprobe
        rm ffmpeg.zip ffprobe.zip
    else
        echo "Error: Failed to download FFmpeg files"
        exit 1
    fi
fi

# Check if PyInstaller is installed
if ! command -v pyinstaller &> /dev/null; then
    echo "PyInstaller is not installed. Installing it now..."
    pip install pyinstaller
fi

# Build the executable
pyinstaller --onefile --add-data "ffmpeg_bin:ffmpeg_bin" imgs_to_vid.py --name video_creator

echo "Executable created: dist/video_creator"