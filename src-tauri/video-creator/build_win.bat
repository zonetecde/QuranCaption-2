@echo off
echo Creating the executable for Windows...

@REM rem Create the ffmpeg_bin folder if it does not exist
@REM if not exist ffmpeg_bin mkdir ffmpeg_bin

@REM rem Download FFmpeg for Windows if necessary
@REM if not exist ffmpeg_bin\ffmpeg.exe (
@REM     echo Downloading FFmpeg for Windows...
@REM     powershell -Command "Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile 'ffmpeg.zip'"
@REM     powershell -Command "Expand-Archive -Path 'ffmpeg.zip' -DestinationPath 'temp_ffmpeg' -Force"
@REM     copy temp_ffmpeg\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe ffmpeg_bin\
@REM     copy temp_ffmpeg\ffmpeg-master-latest-win64-gpl\bin\ffprobe.exe ffmpeg_bin\
@REM     rmdir /S /Q temp_ffmpeg
@REM     del ffmpeg.zip
@REM )

rem Build the executable
pyinstaller --onefile imgs_to_vid.py --name video_creator

echo Executable created: dist\video_creator.exe