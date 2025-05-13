#!/bin/bash
echo "Creating the executable for macOS..."

# Création du dossier ffmpeg_bin s'il n'existe pas
mkdir -p ffmpeg_bin

# Téléchargement de FFmpeg pour macOS si nécessaire
if [ ! -f ffmpeg_bin/ffmpeg ] || [ ! -f ffmpeg_bin/ffprobe ]; then
    echo "Downloading FFmpeg for macOS..."
    curl -L https://evermeet.cx/ffmpeg/ffmpeg.zip -o ffmpeg.zip
    curl -L https://evermeet.cx/ffmpeg/ffprobe.zip -o ffprobe.zip
    unzip ffmpeg.zip -d ffmpeg_bin
    unzip ffprobe.zip -d ffmpeg_bin
    chmod +x ffmpeg_bin/ffmpeg
    chmod +x ffmpeg_bin/ffprobe
    rm ffmpeg.zip ffprobe.zip
fi

# Construction de l'exécutable
python3 -m PyInstaller --onefile --add-data "ffmpeg_bin:ffmpeg_bin" imgs_to_vid.py --name video_creator

echo "Executable created: dist/video_creator"