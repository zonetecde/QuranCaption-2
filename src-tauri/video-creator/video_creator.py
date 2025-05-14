import os
import re
import argparse
import subprocess
import tempfile
import shutil
import sys
from PIL import Image
import platform

def find_ffmpeg_path():
    """Determine the path to ffmpeg executable based on the platform."""
    # Check if ffmpeg and ffprobe are in the same directory as the Python file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    local_ffmpeg = os.path.join(script_dir, "ffmpeg.exe" if platform.system() == "Windows" else "ffmpeg")
    local_ffprobe = os.path.join(script_dir, "ffprobe.exe" if platform.system() == "Windows" else "ffprobe")
    
    if os.path.exists(local_ffmpeg) and os.path.exists(local_ffprobe):
        return local_ffmpeg, local_ffprobe

    # Fallback to system PATH
    return "ffmpeg", "ffprobe"

def create_video_from_images(folder_path, audio_path, transition_ms, start_time_ms=0, end_time_ms=0, output_path=None, top_ratio=0.2, bottom_ratio=0.2):
    """
    Creates a video from images in a folder with timing information in filenames.
    Applies fade transition only to the middle section of the image height.
    
    Parameters:
    - folder_path: Path to folder containing PNG images
    - audio_path: Path to audio file
    - transition_ms: Transition duration in milliseconds
    - start_time_ms: Start time for trimming in milliseconds (0 = no trim)
    - end_time_ms: End time for trimming in milliseconds (0 = until the end)
    - output_path: Custom output path (None = default path in folder)
    - top_ratio: Ratio of image height for the top section (default: 0.2 or 20%, 0 = no top section)
    - bottom_ratio: Ratio of image height for the bottom section (default: 0.2 or 20%, 0 = no bottom section)
    """
    # Get ffmpeg paths
    ffmpeg_path, ffprobe_path = find_ffmpeg_path()
    
    # Convert transition time from ms to seconds
    transition_sec = transition_ms / 1000.0
    
    # Get all PNG files from the folder
    image_files = [f for f in os.listdir(folder_path) if f.endswith('.png')]
    
    # Extract timing information and sort by start time
    image_data = []
    for img_file in image_files:
        match = re.match(r'(\d+)_(\d+)\.png', img_file)
        if match:
            start_time = int(match.group(1)) / 1000.0  # Convert to seconds
            end_time = int(match.group(2)) / 1000.0    # Convert to seconds
            image_data.append({
                'file': img_file,
                'start_time': start_time,
                'end_time': end_time,
                'path': os.path.join(folder_path, img_file)
            })
    
    # Sort by start time
    image_data.sort(key=lambda x: x['start_time'])
    
    if not image_data:
        print("No images found with the correct filename format.")
        return 1
    
    print(f"Found {len(image_data)} images to include in the video.")
    
    # Set default output path if not provided
    if output_path is None:
        output_path = os.path.join(folder_path, "output_video.mp4")
    
    # Create a temporary directory for our intermediate files
    temp_dir = tempfile.mkdtemp()
    try:
        # First, analyze image dimensions
        print("Analyzing image dimensions...")
        first_img = Image.open(image_data[0]['path'])
        width, height = first_img.size
        first_img.close()
        
        # Validate ratios to ensure they're within reasonable bounds
        if top_ratio < 0 or top_ratio > 0.5 or bottom_ratio < 0 or bottom_ratio > 0.5 or (top_ratio + bottom_ratio) >= 1.0:
            print(f"Invalid ratios. The top ratio ({top_ratio}) and bottom ratio ({bottom_ratio}) must be between 0 and 0.5, and their sum must be less than 1.0")
            return 1
        
        # Special case: if both top_ratio and bottom_ratio are 0, we skip sectioning
        use_sectioning = not (top_ratio == 0 and bottom_ratio == 0)
            
        # Calculate middle ratio based on top and bottom ratios
        middle_ratio = 1.0 - (top_ratio + bottom_ratio)
        
        # Calculate region heights based on the ratios
        # Ensure all heights are even numbers (required for YUV420p)
        # Set minimum height to 2 pixels if ratio is not 0
        top_height = max(2, int(height * top_ratio) // 2 * 2) if top_ratio > 0 else 0
        bottom_height = max(2, int(height * bottom_ratio) // 2 * 2) if bottom_ratio > 0 else 0
        middle_height = height - top_height - bottom_height
        if middle_height % 2 != 0:  # Ensure middle height is even
            middle_height -= 1
            if bottom_height > 0:
                bottom_height += 1
        
        print(f"Dimensions: {width}x{height}")
        print(f"Ratios: Top={top_ratio:.2f}, Middle={middle_ratio:.2f}, Bottom={bottom_ratio:.2f}")
        print(f"Regions (adjusted to be even): Top={top_height}px, Middle={middle_height}px, Bottom={bottom_height}px")
        
        # Make sure width is also even
        if width % 2 != 0:
            width -= 1  # Reduce width by 1 if odd
            
        # Create temporary log file for FFmpeg output
        log_file = os.path.join(temp_dir, "ffmpeg_log.txt")
        
        # If no sectioning (top_ratio = 0 and bottom_ratio = 0), create videos directly
        if not use_sectioning:
            print("No sectioning: creating video segments directly...")
            segment_files = []
            
            for i, data in enumerate(image_data):
                print(f"Processing image {i+1}/{len(image_data)}: {data['file']} ({data['start_time']}s - {data['end_time']}s)")
                img_path = data['path']
                duration = data['end_time'] - data['start_time']
                
                # Create video segment with fade effects directly
                segment_file = os.path.join(temp_dir, f"segment_{i:04d}.mp4")
                fade_in = "fade=in:st=0:d=" + str(transition_sec) if i > 0 else "null"
                fade_out = "fade=out:st=" + str(max(0, duration - transition_sec)) + ":d=" + str(transition_sec) if i < len(image_data) - 1 else "null"
                
                cmd = [
                    ffmpeg_path,
                    '-y',
                    '-loop', '1',
                    '-i', img_path,
                    '-vf', f'fps=30,{fade_in},{fade_out}',
                    '-c:v', 'libx264',
                    '-t', str(duration),
                    '-pix_fmt', 'yuv420p',
                    '-preset', 'veryfast',
                    segment_file
                ]
                with open(log_file, 'a') as f:
                    subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
                segment_files.append(segment_file)
        else:
            # Continue with the original sectioning approach
            # Prepare intermediate files for each image section
            for i, data in enumerate(image_data):
                print(f"Processing image {i+1}/{len(image_data)}: {data['file']} ({data['start_time']}s - {data['end_time']}s)")
                img_path = data['path']
                duration = data['end_time'] - data['start_time']
                
                # Create top section (remains intact) - only if top_ratio > 0
                top_section = os.path.join(temp_dir, f"top_{i:04d}.mp4")
                if top_height > 0:
                    cmd = [
                        ffmpeg_path,
                        '-y',
                        '-loop', '1',
                        '-i', img_path,
                        '-vf', f'crop={width}:{top_height}:0:0,fps=30',
                        '-c:v', 'libx264',
                        '-t', str(duration),
                        '-pix_fmt', 'yuv420p',
                        '-preset', 'veryfast',
                        top_section
                    ]
                    with open(log_file, 'a') as f:
                        subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
                
                # Create middle section (with fade effects)
                middle_section = os.path.join(temp_dir, f"middle_{i:04d}.mp4")
                fade_in = "fade=in:st=0:d=" + str(transition_sec) if i > 0 else "null"
                fade_out = "fade=out:st=" + str(max(0, duration - transition_sec)) + ":d=" + str(transition_sec) if i < len(image_data) - 1 else "null"
                
                cmd = [
                    ffmpeg_path,
                    '-y',
                    '-loop', '1',
                    '-i', img_path,
                    '-vf', f'crop={width}:{middle_height}:0:{top_height},fps=30,{fade_in},{fade_out}',
                    '-c:v', 'libx264',
                    '-t', str(duration),
                    '-pix_fmt', 'yuv420p',
                    '-preset', 'veryfast',
                    middle_section
                ]
                with open(log_file, 'a') as f:
                    subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
                
                # Create bottom section (remains intact) - only if bottom_ratio > 0
                bottom_section = os.path.join(temp_dir, f"bottom_{i:04d}.mp4")
                if bottom_height > 0:
                    cmd = [
                        ffmpeg_path,
                        '-y',
                        '-loop', '1',
                        '-i', img_path,
                        '-vf', f'crop={width}:{bottom_height}:0:{top_height + middle_height},fps=30',
                        '-c:v', 'libx264',
                        '-t', str(duration),
                        '-pix_fmt', 'yuv420p',
                        '-preset', 'veryfast',
                        bottom_section
                    ]
                    with open(log_file, 'a') as f:
                        subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
            
            # Create intermediate combined segments
            segment_files = []
            print("Combining sections for each image...")
            
            for i, data in enumerate(image_data):
                duration = data['end_time'] - data['start_time']
                
                # Create a filtercomplex to stack the sections based on what exists
                segment_file = os.path.join(temp_dir, f"segment_{i:04d}.mp4")
                
                # Build different filter complexes based on which sections exist
                if top_height > 0 and bottom_height > 0:
                    # All three sections exist
                    filter_complex = (
                        f"[0:v][1:v]vstack=inputs=2[temp];"
                        f"[temp][2:v]vstack=inputs=2[outv]"
                    )
                    cmd = [
                        ffmpeg_path,
                        '-y',
                        '-i', os.path.join(temp_dir, f"top_{i:04d}.mp4"),
                        '-i', os.path.join(temp_dir, f"middle_{i:04d}.mp4"),
                        '-i', os.path.join(temp_dir, f"bottom_{i:04d}.mp4"),
                        '-filter_complex', filter_complex,
                        '-map', '[outv]',
                        '-c:v', 'libx264',
                        '-preset', 'veryfast',
                        '-t', str(duration),
                        segment_file
                    ]
                elif top_height > 0:
                    # Only top and middle sections
                    filter_complex = "[0:v][1:v]vstack=inputs=2[outv]"
                    cmd = [
                        ffmpeg_path,
                        '-y',
                        '-i', os.path.join(temp_dir, f"top_{i:04d}.mp4"),
                        '-i', os.path.join(temp_dir, f"middle_{i:04d}.mp4"),
                        '-filter_complex', filter_complex,
                        '-map', '[outv]',
                        '-c:v', 'libx264',
                        '-preset', 'veryfast',
                        '-t', str(duration),
                        segment_file
                    ]
                elif bottom_height > 0:
                    # Only middle and bottom sections
                    filter_complex = "[0:v][1:v]vstack=inputs=2[outv]"
                    cmd = [
                        ffmpeg_path,
                        '-y',
                        '-i', os.path.join(temp_dir, f"middle_{i:04d}.mp4"),
                        '-i', os.path.join(temp_dir, f"bottom_{i:04d}.mp4"),
                        '-filter_complex', filter_complex,
                        '-map', '[outv]',
                        '-c:v', 'libx264',
                        '-preset', 'veryfast',
                        '-t', str(duration),
                        segment_file
                    ]
                else:
                    # Only middle section (no stacking needed)
                    shutil.copy2(os.path.join(temp_dir, f"middle_{i:04d}.mp4"), segment_file)
                    cmd = None
                
                if cmd:
                    with open(log_file, 'a') as f:
                        subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
                segment_files.append(segment_file)
        
        # Create a concat file to sequence all segments
        concat_list_path = os.path.join(temp_dir, "segments.txt")
        with open(concat_list_path, 'w') as f:
            for segment_file in segment_files:
                f.write(f"file '{segment_file}'\n")
        
        # Concatenate all segments
        print("Assembling segments into a complete video...")
        silent_video = os.path.join(temp_dir, "silent_video.mp4")
        cmd = [
            ffmpeg_path,
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_list_path,
            '-c', 'copy',
            silent_video
        ]
        with open(log_file, 'a') as f:
            subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
        
        # Add audio to create the full video
        full_video = os.path.join(temp_dir, "full_video.mp4")
        cmd = [
            ffmpeg_path,
            '-y',
            '-i', silent_video,
            '-i', audio_path,
            '-map', '0:v',
            '-map', '1:a',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-shortest',
            full_video
        ]
        with open(log_file, 'a') as f:
            subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
        
        # Step 3: Apply trimming if requested
        final_output = output_path
        
        if start_time_ms > 0 or end_time_ms > 0:
            print(f"Applying trim: start={start_time_ms}ms" + (f", end={end_time_ms}ms" if end_time_ms > 0 else ""))
            
            trim_cmd = [ffmpeg_path, '-y', '-i', full_video]
            
            # Add trim parameters
            trim_args = []
            if start_time_ms > 0:
                start_time_sec = start_time_ms / 1000.0
                trim_args.extend(['-ss', str(start_time_sec)])
            
            if end_time_ms > 0:
                end_time_sec = end_time_ms / 1000.0
                # Calculate duration from start point
                if start_time_ms > 0:
                    duration_sec = end_time_sec - (start_time_ms / 1000.0)
                    trim_args.extend(['-t', str(duration_sec)])
                else:
                    # If no start time specified, use -to
                    trim_args.extend(['-to', str(end_time_sec)])
            
            # Output options
            trim_cmd.extend(trim_args)
            trim_cmd.extend(['-c:v', 'copy', '-c:a', 'copy', final_output])
            
            with open(log_file, 'a') as f:
                subprocess.run(trim_cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
        else:
            # If no trimming, just copy the full video to the output path
            shutil.copy2(full_video, final_output)
        
        # Get the final video duration
        duration_cmd = [ffprobe_path, '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', final_output]
        result = subprocess.run(duration_cmd, capture_output=True, text=True)
        try:
            final_duration = float(result.stdout.strip())
            print(f"Final video duration: {final_duration:.2f} seconds")
        except ValueError:
            print("Unable to determine the final duration of the video")
        
        print(f"Video successfully created: {final_output}")
        if use_sectioning:
            middle_percent = int(middle_ratio * 100)
            print(f"Fade was applied only to the central part ({middle_percent}% of the height).")
        else:
            print("Fade was applied to the entire image (no sectioning).")
        if start_time_ms > 0 or end_time_ms > 0:
            print(f"Video trimmed: start at {start_time_ms}ms" + (f" until {end_time_ms}ms" if end_time_ms > 0 else ""))
        
        return 0  # Success
    
    except Exception as e:
        print(f"An error occurred: {e}")
        print(f"Check the FFmpeg log for more details: {log_file}")
        return 1  # Error
    
    finally:
        # Don't clean up temp directory if there was an error, so logs can be examined
        if 'log_file' in locals() and os.path.exists(log_file):
            print(f"The temporary folder was not deleted to allow examination of the files: {temp_dir}")
        else:
            shutil.rmtree(temp_dir, ignore_errors=True)

def main():
    parser = argparse.ArgumentParser(description="Create a video from images with fade applied only to the middle section")
    parser.add_argument("folder_path", help="Path to the folder containing PNG images")
    parser.add_argument("audio_path", help="Path to the audio file")
    parser.add_argument("transition_ms", type=int, help="Transition duration in milliseconds")
    parser.add_argument("start_time", type=int, 
                        help="Start time for trimming the final video (in milliseconds, 0 = no trimming)")
    parser.add_argument("end_time", type=int, 
                        help="End time for trimming the final video (in milliseconds, 0 = until the end)")
    parser.add_argument("output_path", help="Custom path for the output video")
    parser.add_argument("--top-ratio", type=float, default=0.2,
                        help="Ratio of the height for the top section (0.0 to 0.5, default: 0.2 or 20%%)")
    parser.add_argument("--bottom-ratio", type=float, default=0.2,
                        help="Ratio of the height for the bottom section (0.0 to 0.5, default: 0.2 or 20%%)")
    
    args = parser.parse_args()
    
    return create_video_from_images(
        args.folder_path, 
        args.audio_path, 
        args.transition_ms,
        args.start_time,
        args.end_time,
        args.output_path,
        args.top_ratio,
        args.bottom_ratio
    )

if __name__ == "__main__":
    sys.exit(main())

# Exemple d'utilisation standard (avec les ratios par défaut de 20%):
#py .\video_creator.py C:\Users\zonedetec\Documents\source\tauri\QuranCaption-2\src-tauri\target\debug\export\907260 C:\Users\zonedetec\Documents\quran.al.luhaidan\46\audio_9107.webm 300 5000 7000 ./output.mp4 --top-ratio 0.2 --bottom-ratio 0.2

# Exemple pour exécutable compilé:
#video_creator C:\Users\zonedetec\Documents\source\tauri\QuranCaption-2\src-tauri\target\debug\export\907260 C:\Users\zonedetec\Documents\quran.al.luhaidan\46\audio_9107.webm 300 5000 7000 ./output.mp4 --top-ratio 0.2 --bottom-ratio 0.2