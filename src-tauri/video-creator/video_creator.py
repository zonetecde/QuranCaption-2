import argparse
import cv2
import numpy as np
import os
import sys
import platform
from moviepy.editor import AudioFileClip, VideoClip
from moviepy.config import change_settings
from concurrent.futures import ThreadPoolExecutor
import re
from PIL import Image
import time

def get_ffmpeg_path():
    """Get the FFmpeg path, checking first in the executable's directory."""
    # Get the directory of the executable or script
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        app_dir = os.path.dirname(sys.executable)
    else:
        # Running as script
        app_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check if FFmpeg exists in the same folder
    if platform.system() == 'Windows':
        ffmpeg_name = 'ffmpeg.exe'
    else:  # macOS or Linux
        ffmpeg_name = 'ffmpeg'
    
    local_ffmpeg = os.path.join(app_dir, ffmpeg_name)
    
    if os.path.exists(local_ffmpeg):
        print(f"Using bundled FFmpeg: {local_ffmpeg}")
        return local_ffmpeg
    else:
        print("Bundled FFmpeg not found, using system PATH")
        return ffmpeg_name  # Use from system PATH

def sort_by_time(filename):
    """Extract the start time from filename for sorting."""
    start_time = int(re.match(r'(\d+)_\d+\.png', filename).group(1))
    return start_time

def process_images_to_frames(folder_path, transition_ms, top_ratio, bottom_ratio, dynamic_top):
    """Process images and prepare frames for the video."""
    # Get all PNG files and sort them by start time
    image_files = [f for f in os.listdir(folder_path) if f.endswith('.png')]
    image_files.sort(key=sort_by_time)
    
    if not image_files:
        raise ValueError("No PNG files found in the specified folder.")
    
    # List to store processed frames with their timestamps
    frames_data = []
    
    # Load the first image to get dimensions
    first_image_path = os.path.join(folder_path, image_files[0])
    first_image = cv2.imread(first_image_path)
    height, width = first_image.shape[:2]
    
    # Calculate section heights
    top_height = int(height * top_ratio)
    bottom_height = int(height * bottom_ratio)
    middle_height = height - top_height - bottom_height
    
    # Store static sections
    static_bottom = first_image[-bottom_height:] if bottom_height > 0 else None
    static_top = None if dynamic_top == 1 else first_image[:top_height] if top_height > 0 else None
    
    # Process each image
    for i, image_file in enumerate(image_files):
        # Extract timing from filename
        match = re.match(r'(\d+)_(\d+)\.png', image_file)
        if not match:
            continue
        
        start_ms = int(match.group(1))
        end_ms = int(match.group(2))
        
        # Load image
        img_path = os.path.join(folder_path, image_file)
        img = cv2.imread(img_path)
        
        # Extract sections
        current_top = img[:top_height] if top_height > 0 else None
        current_middle = img[top_height:height-bottom_height] if middle_height > 0 else None
        
        # Store the frame data
        frames_data.append({
            'start_ms': start_ms,
            'end_ms': end_ms,
            'middle': current_middle,
            'top': current_top if dynamic_top == 1 else None
        })
    
    return frames_data, static_top, static_bottom, (height, width)

def create_fade_frames(current_frame, next_frame, num_fade_frames):
    """Create fade frames between two images (fade to black and then to next image)."""
    fade_frames = []
    
    # Fade to black
    for i in range(num_fade_frames // 2):
        alpha = 1.0 - (i / (num_fade_frames // 2))
        fade_frame = cv2.addWeighted(current_frame, alpha, np.zeros_like(current_frame), 1-alpha, 0)
        fade_frames.append(fade_frame)
    
    # Fade from black to next image
    for i in range(num_fade_frames // 2):
        alpha = i / (num_fade_frames // 2)
        fade_frame = cv2.addWeighted(next_frame, alpha, np.zeros_like(next_frame), 1-alpha, 0)
        fade_frames.append(fade_frame)
    
    return fade_frames

def make_frame(t_ms, frames_data, static_top, static_bottom, dimensions, transition_ms):
    """Create a frame at the given time."""
    height, width = dimensions
    t = t_ms / 1000.0  # Convert to seconds
    t_ms = int(t * 1000)  # Current time in milliseconds
    
    # Find which image should be displayed at this time
    current_frame_data = None
    next_frame_data = None
    
    for i, frame_data in enumerate(frames_data):
        if frame_data['start_ms'] <= t_ms < frame_data['end_ms']:
            current_frame_data = frame_data
            if i + 1 < len(frames_data):
                next_frame_data = frames_data[i + 1]
            break
    
    if current_frame_data is None:
        # If we're past the last frame, use the last one
        if t_ms >= frames_data[-1]['end_ms']:
            current_frame_data = frames_data[-1]
        else:
            # Otherwise use the first frame
            current_frame_data = frames_data[0]
    
    # Calculate time for transition
    in_transition = False
    transition_progress = 0.0
    
    if next_frame_data and (next_frame_data['start_ms'] - transition_ms <= t_ms < next_frame_data['start_ms']):
        in_transition = True
        transition_progress = (t_ms - (next_frame_data['start_ms'] - transition_ms)) / transition_ms
    
    # Create the frame
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Add top section
    top_height = 0
    if static_top is not None:
        top_height = static_top.shape[0]
        frame[:top_height] = static_top
    elif current_frame_data['top'] is not None:
        top_height = current_frame_data['top'].shape[0]
        frame[:top_height] = current_frame_data['top']
    
    # Add middle section with transition if needed
    middle_section = current_frame_data['middle']
    middle_height = middle_section.shape[0]
    
    if in_transition and next_frame_data:
        # First half: fade to black
        if transition_progress < 0.5:
            alpha = 1.0 - transition_progress * 2
            middle_blended = cv2.addWeighted(middle_section, alpha, np.zeros_like(middle_section), 1-alpha, 0)
        # Second half: fade from black
        else:
            alpha = (transition_progress - 0.5) * 2
            next_middle = next_frame_data['middle']
            middle_blended = cv2.addWeighted(next_middle, alpha, np.zeros_like(next_middle), 1-alpha, 0)
        
        frame[top_height:top_height+middle_height] = middle_blended
    else:
        frame[top_height:top_height+middle_height] = middle_section
    
    # Add bottom section
    if static_bottom is not None:
        frame[-static_bottom.shape[0]:] = static_bottom
    
    return frame

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
    parser.add_argument("top_ratio", type=float,
                        help="Ratio of the height for the top section (0.0 to 0.5)")
    parser.add_argument("bottom_ratio", type=float,
                        help="Ratio of the height for the bottom section (0.0 to 0.5)")
    parser.add_argument("dynamic_top", type=int,
                        help="Set to 1 for dynamic top section (process top section for each image separately, no fade effect), 0 for static top section (default behavior)")
    
    args = parser.parse_args()
    
    # Configure FFmpeg path
    ffmpeg_path = get_ffmpeg_path()
    change_settings({"FFMPEG_BINARY": ffmpeg_path})
    
    # Validate ratios
    if not (0 <= args.top_ratio <= 0.5 and 0 <= args.bottom_ratio <= 0.5 and args.top_ratio + args.bottom_ratio <= 1):
        raise ValueError("Invalid top_ratio or bottom_ratio. Must be between 0.0 and 0.5, and sum <= 1.0")
    
    print(f"Starting video creation process...")
    start_time = time.time()
    
    # Process images and prepare frames data
    frames_data, static_top, static_bottom, dimensions = process_images_to_frames(
        args.folder_path, args.transition_ms, args.top_ratio, args.bottom_ratio, args.dynamic_top
    )
    
    # Load audio file
    audio = AudioFileClip(args.audio_path)
    
    # Determine video duration based on frames and trim settings
    last_frame_end = frames_data[-1]['end_ms']
    
    # IMPORTANT: Always use the last frame's end time as the video end time
    # Only trim the beginning if start_time is specified
    start_ms = args.start_time if args.start_time > 0 else 0
    
    # For the end time, use either:
    # 1. The end_time parameter if specified (and less than last_frame_end)
    # 2. The end time of the last frame otherwise
    if args.end_time > 0 and args.end_time < last_frame_end:
        duration_ms = args.end_time
    else:
        duration_ms = last_frame_end
    
    duration_sec = (duration_ms - start_ms) / 1000.0
    
    print(f"Video duration will be: {duration_sec:.2f} seconds (from {start_ms}ms to {duration_ms}ms)")
    
    # Create VideoClip with our make_frame function
    def make_frame_wrapper(t):
        # t is in seconds, convert to ms and add start_time offset
        t_ms = int(t * 1000) + start_ms
        return make_frame(t_ms, frames_data, static_top, static_bottom, dimensions, args.transition_ms)
    
    video = VideoClip(make_frame_wrapper, duration=duration_sec)
    
    # Trim audio to match video duration - ensure audio won't extend past the video
    audio_duration = min(duration_sec, audio.duration)
    trimmed_audio = audio.subclip(start_ms/1000, start_ms/1000 + audio_duration)
    
    # Set audio to video
    final_video = video.set_audio(trimmed_audio)
    
    # Write output with appropriate codec and high speed
    print(f"Rendering video to {args.output_path}...")
    final_video.write_videofile(
        args.output_path,
        fps=30,
        codec='libx264',
        audio_codec='aac',
        preset='ultrafast',  # For fast encoding
        threads=8,           # Use multiple threads
        ffmpeg_params=['-crf', '23']  # Balance between quality and size
    )
    
    print(f"Video creation completed in {time.time() - start_time:.2f} seconds")
    print(f"Final video duration: {duration_sec:.2f} seconds")

if __name__ == "__main__":
    main()