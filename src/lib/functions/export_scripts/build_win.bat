@echo off
echo Creating the executable for Windows...

rem Create the ffmpeg_bin folder if it does not exist
if not exist ffmpeg_bin mkdir ffmpeg_bin

rem Download FFmpeg for Windows if necessary
if not exist ffmpeg_bin\ffmpeg.exe (
    echo Downloading FFmpeg for Windows...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile 'ffmpeg.zip'"
    powershell -Command "Expand-Archive -Path 'ffmpeg.zip' -DestinationPath 'temp_ffmpeg' -Force"
    copy temp_ffmpeg\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe ffmpeg_bin\
    copy temp_ffmpeg\ffmpeg-master-latest-win64-gpl\bin\ffprobe.exe ffmpeg_bin\
    rmdir /S /Q temp_ffmpeg
    del ffmpeg.zip
)

rem Build the executable
pyinstaller --onefile --add-data "ffmpeg_bin;ffmpeg_bin" imgs_to_vid.py --name video_creator

echo Executable created: dist\video_creator.exe