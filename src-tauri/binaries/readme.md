In this folder, install `ffprobe`, `ffmpeg`, `yt-dlp` and compile the `src-tauri\video-creator\video_creator.py` script.

#### 🔧 Download Links (per OS) for FFMPEG and FFPROBE

**For Windows**  
Download the `.exe` files and place them in `src-tauri/binaries`:

- [ffprobe.exe and ffmpeg.exe](https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-essentials.7z)
- [yt-dlp.exe](https://github.com/yt-dlp/yt-dlp/releases/download/2025.03.31/yt-dlp.exe)

**For Linux**  
Download the files **without extensions** and place them in `src-tauri/binaries`:

- [ffprobe and ffmpeg](https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases/download/2025.03.31/yt-dlp_linux)

> ⚠️ Make sure the files are executable (`chmod +x`).

**For MacOS**  
Download the files **without extensions** and place them in `src-tauri/binaries`:

- [ffprobe (static build)](https://evermeet.cx/ffmpeg/ffprobe-119416-g1dbc5675c1.7z)
- [ffmpeg (static build)](https://evermeet.cx/ffmpeg/ffmpeg-119416-g1dbc5675c1.7z)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases/download/2025.04.30/yt-dlp_macos)

> ⚠️ Make sure the files are executable (`chmod +x`).

#### 📜 Compile the Python Script

To compile the Python script, navigate to the `src-tauri/video-creator` directory and run the `build_win.bat` file for Windows or the `build_mac.sh` file for MacOS. This will generate a `video_creator.exe` file in the `src-tauri/binaries` folder.

> ⚠️ Ensure the `build_mac.sh` file is executable on MacOS (`chmod +x`).
