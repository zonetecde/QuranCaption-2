# filepath: f:\Programmation\tauri\QuranCaption-2\src-tauri\video-creator\video_creator.py
import argparse
import shutil
import cv2
import numpy as np
import os
import sys
import platform
from moviepy.editor import AudioFileClip, VideoClip, VideoFileClip, ImageClip
from moviepy.config import change_settings
from concurrent.futures import ThreadPoolExecutor
import re
from PIL import Image
import time
from proglog import ProgressBarLogger

class MyBarLogger(ProgressBarLogger):
    last_percent = 0
    number_of_reached_100 = 0
    has_audio = True  # Par défaut, on suppose qu'il y a de l'audio
    
    def set_audio_status(self, has_audio):
        """Configure si la vidéo a de l'audio ou non"""
        self.has_audio = has_audio
    
    def callback(self, **changes):
        # Every time the logger message is updated, this function is called with
        # the `changes` dictionary of the form `parameter: new value`.
        for (parameter, value) in changes.items():
            print ('Parameter %s is now %s' % (parameter, value))
    
    def bars_callback(self, bar, attr, value, old_value=None):
        # pour des raisons inconnues il y a un 100% qui passe en tout premier
        # ceci permet de l'ignorer
        
        # Every time the logger progress is updated, this function is called        
        percentage = round((value / self.bars[bar]['total']) * 100)

        if percentage != self.last_percent:
            status = ""
            if self.number_of_reached_100 == 0:
                status = "Initializing..."
            elif self.number_of_reached_100 == 1:
                if self.has_audio:
                    status = "Exporting audio..."
                else:
                    # Pas d'audio, on passe directement à l'export vidéo
                    status = "Exporting video..."
            elif self.number_of_reached_100 == 2:
                status = "Exporting video..."

            print("percentage: " + str(percentage) + "% | status: " + status, flush=True)
            self.last_percent = percentage

            if percentage == 100:
                self.number_of_reached_100 += 1

logger = MyBarLogger()

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

def load_image_with_alpha(image_path, preserve_alpha=True):
    """Load image with alpha channel preserved if needed."""
    try:
        if preserve_alpha:
            # Use numpy to read file data to handle unicode paths
            with open(image_path, 'rb') as f:
                file_data = np.frombuffer(f.read(), dtype=np.uint8)
            
            # Decode image from buffer with alpha channel
            img_rgba = cv2.imdecode(file_data, cv2.IMREAD_UNCHANGED)
            
            if img_rgba is None:
                return None, None
            
            # Check if image has alpha channel
            if len(img_rgba.shape) == 3 and img_rgba.shape[2] == 4:
                # Convert BGRA to RGBA for consistency
                img_rgba = cv2.cvtColor(img_rgba, cv2.COLOR_BGRA2RGBA)
                # Split into color and alpha
                img_rgb = img_rgba[:, :, :3]
                alpha = img_rgba[:, :, 3] / 255.0  # Normalize alpha to 0-1
                return img_rgb, alpha
            else:
                # No alpha channel, convert BGR to RGB and create full opacity mask
                if len(img_rgba.shape) == 3:
                    img_rgb = cv2.cvtColor(img_rgba, cv2.COLOR_BGR2RGB)
                else:
                    # Grayscale image
                    img_rgb = cv2.cvtColor(img_rgba, cv2.COLOR_GRAY2RGB)
                alpha = np.ones((img_rgb.shape[0], img_rgb.shape[1]), dtype=np.float32)
                return img_rgb, alpha
        else:
            # Fast loading without alpha for solid backgrounds
            with open(image_path, 'rb') as f:
                file_data = np.frombuffer(f.read(), dtype=np.uint8)
            
            img_bgr = cv2.imdecode(file_data, cv2.IMREAD_COLOR)
            
            if img_bgr is None:
                return None, None
            
            # Convert BGR to RGB
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            # Return None for alpha when not needed
            return img_rgb, None
    except Exception as e:
        print(f"Error loading image {image_path}: {e}")
        return None, None

def blend_with_alpha(foreground, background, alpha, position=None):
    """Blend foreground with background using alpha channel."""
    if position is None:
        # Full overlay
        if foreground.shape[:2] != background.shape[:2]:
            return background
        
        # Expand alpha to 3 channels
        alpha_3ch = np.stack([alpha, alpha, alpha], axis=2)
        
        # Blend: result = foreground * alpha + background * (1 - alpha)
        result = (foreground * alpha_3ch + background * (1 - alpha_3ch)).astype(np.uint8)
        return result
    else:
        # Positioned overlay
        y, x = position
        h, w = foreground.shape[:2]
        bg_h, bg_w = background.shape[:2]
        
        # Ensure we don't go out of bounds
        if y + h > bg_h or x + w > bg_w or y < 0 or x < 0:
            return background
        
        result = background.copy()
        alpha_3ch = np.stack([alpha, alpha, alpha], axis=2)
        
        # Blend only the region
        bg_region = result[y:y+h, x:x+w]
        blended_region = (foreground * alpha_3ch + bg_region * (1 - alpha_3ch)).astype(np.uint8)
        result[y:y+h, x:x+w] = blended_region
        return result

def sort_by_time(filename):
    """Extract the start time from filename for sorting."""
    start_time = int(re.match(r'(\d+)_\d+\.png', filename).group(1))
    return start_time

def process_images_to_frames(folder_path, transition_ms, top_ratio, bottom_ratio, dynamic_top, has_background=False):
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
    first_image_rgb, first_image_alpha = load_image_with_alpha(first_image_path, preserve_alpha=has_background)
    if first_image_rgb is None:
        raise ValueError(f"Could not load first image: {first_image_path}")
    
    height, width = first_image_rgb.shape[:2]
    
    # Extract background color from pixel (10,10) for transitions
    background_color = None
    background_alpha = None
    if has_background and 10 < height and 10 < width:
        background_color = first_image_rgb[10, 10].copy()  # RGB color
        if first_image_alpha is not None:
            background_alpha = first_image_alpha[10, 10]
        else:
            background_alpha = 1.0
        print(f"Background color for transitions: RGB{tuple(background_color)} Alpha:{background_alpha:.3f}")
    elif not has_background:
        # For black background (no background video/image)
        background_color = np.array([0, 0, 0], dtype=np.uint8)
        background_alpha = 1.0
    
    # Calculate section heights
    top_height = int(height * top_ratio)
    bottom_height = int(height * bottom_ratio)
    middle_height = height - top_height - bottom_height
    
    # Store static sections with alpha
    static_bottom = None
    static_bottom_alpha = None
    static_top = None
    static_top_alpha = None
    
    if bottom_height > 0:
        static_bottom = first_image_rgb[-bottom_height:]
        static_bottom_alpha = first_image_alpha[-bottom_height:] if first_image_alpha is not None else None
    
    if dynamic_top != 1 and top_height > 0:
        static_top = first_image_rgb[:top_height]
        static_top_alpha = first_image_alpha[:top_height] if first_image_alpha is not None else None
    
    # Process each image
    for i, image_file in enumerate(image_files):
        # Extract timing from filename
        match = re.match(r'(\d+)_(\d+)\.png', image_file)
        if not match:
            continue
        
        start_ms = int(match.group(1))
        end_ms = int(match.group(2))
        
        # Load image with alpha
        img_path = os.path.join(folder_path, image_file)
        img_rgb, img_alpha = load_image_with_alpha(img_path, preserve_alpha=has_background)
        
        if img_rgb is None:
            continue
        
        # Extract sections with alpha
        current_top = None
        current_top_alpha = None
        current_middle = None
        current_middle_alpha = None
        
        if top_height > 0:
            current_top = img_rgb[:top_height]
            current_top_alpha = img_alpha[:top_height] if img_alpha is not None else None
        
        if middle_height > 0:
            current_middle = img_rgb[top_height:height-bottom_height]
            current_middle_alpha = img_alpha[top_height:height-bottom_height] if img_alpha is not None else None
          # Store the frame data
        frames_data.append({
            'start_ms': start_ms,
            'end_ms': end_ms,
            'middle': current_middle,
            'middle_alpha': current_middle_alpha,
            'top': current_top if dynamic_top == 1 else None,
            'top_alpha': current_top_alpha if dynamic_top == 1 else None
        })
    
    return frames_data, (static_top, static_top_alpha), (static_bottom, static_bottom_alpha), (height, width), (background_color, background_alpha)



def load_background(background_path, dimensions, duration_sec, start_ms, end_ms):
    """Load and prepare background video or image."""
    if not background_path or not os.path.exists(background_path):
        return None, None
    
    height, width = dimensions
    
    # Check if it's an image or video file
    image_extensions = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']
    video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    file_ext = os.path.splitext(background_path.lower())[1]
    
    if file_ext in image_extensions:
        print(f"Loading background image: {background_path}")
        try:
            # Use numpy to read file data to handle unicode paths
            with open(background_path, 'rb') as f:
                file_data = np.frombuffer(f.read(), dtype=np.uint8)
            
            # Decode image from buffer
            img = cv2.imdecode(file_data, cv2.IMREAD_COLOR)
            
            if img is None:
                print(f"Warning: Could not decode background image: {background_path}")
                return None, None
            
            # Convert BGR to RGB for consistency with MoviePy
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Resize to match dimensions
            img = cv2.resize(img, (width, height))
            
            print(f"Background image loaded successfully: {img.shape}")
            return img, None
            
        except Exception as e:
            print(f"Warning: Could not load background image: {e}")
            return None, None
        
    elif file_ext in video_extensions:
        print(f"Loading background video: {background_path}")
        try:
            # Load as video
            background_video = VideoFileClip(background_path)
            
            # Resize to match dimensions
            background_video = background_video.resize((width, height))
            
            # Calculate trim times
            trim_start = start_ms / 1000.0
            trim_end = (end_ms if end_ms > 0 else start_ms + duration_sec * 1000) / 1000.0
            
            # Trim video if needed
            if trim_start > 0 or trim_end < background_video.duration:
                # Make sure we don't exceed video duration
                trim_end = min(trim_end, background_video.duration)
                if trim_start < background_video.duration:
                    background_video = background_video.subclip(trim_start, trim_end)
                else:
                    print(f"Warning: Start time {trim_start}s is beyond video duration {background_video.duration}s")
                    return None, None
            
            # Loop video if it's shorter than needed
            if background_video.duration < duration_sec:
                background_video = background_video.loop(duration=duration_sec)
            
            return background_video, background_video.audio
            
        except Exception as e:
            print(f"Warning: Could not load background video: {e}")
            return None, None
    else:
        print(f"Warning: Unsupported background file format: {file_ext}")
        return None, None

def make_frame(t_ms, frames_data, static_top_data, static_bottom_data, dimensions, transition_ms, background_frame=None, background_color_data=None):
    """Create a frame at the given time."""
    height, width = dimensions
    t = t_ms / 1000.0  # Convert to seconds
    t_ms = int(t * 1000)  # Current time in milliseconds
    
    # Unpack static data
    static_top, static_top_alpha = static_top_data if static_top_data[0] is not None else (None, None)
    static_bottom, static_bottom_alpha = static_bottom_data if static_bottom_data[0] is not None else (None, None)
    
    # Unpack background color data for transitions
    background_color, background_alpha = background_color_data if background_color_data else (None, None)
    
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
    
    # Create the frame - start with background if available, otherwise black
    if background_frame is not None:
        frame = background_frame.copy()
    else:
        frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Determine if we're using alpha blending or direct placement
    use_alpha = background_frame is not None and static_top_alpha is not None
    
    # Add top section
    top_height = 0
    if static_top is not None:
        top_height = static_top.shape[0]
        if use_alpha:
            frame = blend_with_alpha(static_top, frame, static_top_alpha, position=(0, 0))
        else:
            frame[0:top_height] = static_top
    elif current_frame_data['top'] is not None:
        top_height = current_frame_data['top'].shape[0]
        if use_alpha and current_frame_data['top_alpha'] is not None:
            frame = blend_with_alpha(current_frame_data['top'], frame, current_frame_data['top_alpha'], position=(0, 0))
        else:
            frame[0:top_height] = current_frame_data['top']
    
    # Add middle section with transition
    middle_section = current_frame_data['middle']
    middle_alpha = current_frame_data['middle_alpha']
    if middle_section is not None:
        middle_height = middle_section.shape[0]
        
        if in_transition and next_frame_data:
            if use_alpha and middle_alpha is not None:
                # With background and alpha: fade through background color
                if transition_progress < 0.5:
                    # First half: fade current image to background color
                    alpha_factor = 1.0 - transition_progress * 2
                    # Create intermediate frame with background color
                    bg_frame = np.full_like(middle_section, background_color) if background_color is not None else np.zeros_like(middle_section)
                    bg_alpha = np.full_like(middle_alpha, background_alpha) if background_alpha is not None else np.ones_like(middle_alpha)
                    
                    # Blend current image with background color
                    intermediate = cv2.addWeighted(middle_section, alpha_factor, bg_frame, 1-alpha_factor, 0)
                    intermediate_alpha = middle_alpha * alpha_factor + bg_alpha * (1-alpha_factor)
                    frame = blend_with_alpha(intermediate, frame, intermediate_alpha, position=(top_height, 0))
                else:
                    # Second half: fade from background color to next image
                    alpha_factor = (transition_progress - 0.5) * 2
                    next_middle = next_frame_data['middle']
                    next_middle_alpha = next_frame_data['middle_alpha']
                    if next_middle_alpha is not None:
                        # Create intermediate frame with background color
                        bg_frame = np.full_like(next_middle, background_color) if background_color is not None else np.zeros_like(next_middle)
                        bg_alpha = np.full_like(next_middle_alpha, background_alpha) if background_alpha is not None else np.ones_like(next_middle_alpha)
                        
                        # Blend background color with next image
                        intermediate = cv2.addWeighted(bg_frame, 1-alpha_factor, next_middle, alpha_factor, 0)
                        intermediate_alpha = bg_alpha * (1-alpha_factor) + next_middle_alpha * alpha_factor
                        frame = blend_with_alpha(intermediate, frame, intermediate_alpha, position=(top_height, 0))
            else:
                # Without background or alpha: fade RGB values to black
                if transition_progress < 0.5:
                    alpha_factor = 1.0 - transition_progress * 2
                    fade_frame = cv2.addWeighted(middle_section, alpha_factor, np.zeros_like(middle_section), 1-alpha_factor, 0)
                    frame[top_height:top_height+middle_height] = fade_frame
                else:
                    alpha_factor = (transition_progress - 0.5) * 2
                    next_middle = next_frame_data['middle']
                    fade_frame = cv2.addWeighted(next_middle, alpha_factor, np.zeros_like(next_middle), 1-alpha_factor, 0)
                    frame[top_height:top_height+middle_height] = fade_frame
        else:
            # No transition
            if use_alpha and middle_alpha is not None:
                frame = blend_with_alpha(middle_section, frame, middle_alpha, position=(top_height, 0))
            else:
                frame[top_height:top_height+middle_height] = middle_section
    
    # Add bottom section
    if static_bottom is not None:
        if use_alpha and static_bottom_alpha is not None:
            frame = blend_with_alpha(static_bottom, frame, static_bottom_alpha, 
                                    position=(height - static_bottom.shape[0], 0))
        else:
            frame[height - static_bottom.shape[0]:height] = static_bottom
    
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
    parser.add_argument("background_path", 
                        help="Path to background image or video file (empty string for no background)")
    
    args = parser.parse_args()

    # print des args
    print("Arguments received:")
    print(f"Folder path: {args.folder_path}")
    print(f"Audio path: {args.audio_path}")
    print(f"Transition duration: {args.transition_ms} ms")
    print(f"Start time: {args.start_time} ms")
    print(f"End time: {args.end_time} ms")
    print(f"Output path: {args.output_path}")
    print(f"Top ratio: {args.top_ratio}")
    print(f"Bottom ratio: {args.bottom_ratio}")
    print(f"Dynamic top: {args.dynamic_top}")
    print(f"Background path: {args.background_path}")
    
    # Configure FFmpeg path
    ffmpeg_path = get_ffmpeg_path()
    change_settings({"FFMPEG_BINARY": ffmpeg_path})
    
    # Validate ratios
    if not (0 <= args.top_ratio <= 0.5 and 0 <= args.bottom_ratio <= 0.5 and args.top_ratio + args.bottom_ratio <= 1):
        raise ValueError("Invalid top_ratio or bottom_ratio. Must be between 0.0 and 0.5, and sum <= 1.0")
    print(f"Starting video creation process...")
    start_time = time.time()
    
    # Determine if we have a background
    has_background = bool(args.background_path and args.background_path.strip())
      # Process images and prepare frames data
    frames_data, static_top, static_bottom, dimensions, background_color_data = process_images_to_frames(
        args.folder_path, args.transition_ms, args.top_ratio, args.bottom_ratio, args.dynamic_top, has_background
    )
    
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
      # Load background if specified
    background_clip = None
    background_audio = None
    background_image_data = None  # Store image data separately
    
    if args.background_path and args.background_path.strip():
        background_data, background_audio = load_background(
            args.background_path, dimensions, duration_sec, start_ms, duration_ms
        )
        
        if background_data is not None:
            if isinstance(background_data, np.ndarray):
                # It's an image - store it directly
                background_image_data = background_data
                background_clip = "image"
            else:
                # It's a video clip
                background_clip = background_data
                background_data = None  # We'll get frames from the clip
    
    # Load audio file if exists and is valid
    audio = None
    use_background_audio = False
    
    try:
        if args.audio_path and os.path.exists(args.audio_path):
            audio = AudioFileClip(args.audio_path)
            print(f"Audio file loaded successfully: {args.audio_path}")
        else:
            print(f"Warning: Audio file does not exist or is empty: {args.audio_path}")
            # Check if we should use background audio
            if background_audio is not None:
                print("Using background video audio...")
                audio = background_audio
                use_background_audio = True
            else:
                print("Creating video without audio...")
    except Exception as e:
        print(f"Error loading audio file: {e}")
        # Check if we should use background audio
        if background_audio is not None:
            print("Using background video audio...")
            audio = background_audio
            use_background_audio = True
        else:
            print("Creating video without audio...")
    
    # Mettre à jour l'état du logger en fonction de la présence audio
    logger.set_audio_status(audio is not None)
      # Create VideoClip with our make_frame function
    def make_frame_wrapper(t):
        # t is in seconds, convert to ms and add start_time offset
        t_ms = int(t * 1000) + start_ms
          # Get background frame if available
        bg_frame = None
        if background_clip == "image":
            bg_frame = background_image_data
        elif background_clip is not None:
            # Get frame from video clip
            try:
                bg_frame_rgb = background_clip.get_frame(t)
                # Keep RGB format since MoviePy uses RGB and our blend functions expect RGB
                bg_frame = bg_frame_rgb
            except:
                bg_frame = None
        
        return make_frame(t_ms, frames_data, static_top, static_bottom, dimensions, args.transition_ms, bg_frame, background_color_data)
    
    video = VideoClip(make_frame_wrapper, duration=duration_sec)
    
    # Set audio to video if audio is available
    if audio is not None:
        # Trim audio to match video duration - ensure audio won't extend past the video
        audio_duration = min(duration_sec, audio.duration)
        if use_background_audio:
            # For background audio, don't add start_ms offset since it's already trimmed
            trimmed_audio = audio.subclip(0, audio_duration)
        else:
            # For external audio, apply start_ms offset
            trimmed_audio = audio.subclip(start_ms/1000, start_ms/1000 + audio_duration)
        
        # Set audio to video
        final_video = video.set_audio(trimmed_audio)
    else:
        # No audio available - use video without audio
        final_video = video
    
    # Write output with appropriate codec and high speed
    print(f"Rendering video to {args.output_path}...")
    
    # Prepare video encoding parameters based on audio availability
    video_params = {
        'fps': 30,
        'codec': 'libx264',
        'preset': 'ultrafast',  # For fast encoding
        'threads': 8,           # Use multiple threads
        'ffmpeg_params': ['-crf', '23'],  # Balance between quality and size
        'logger': logger
    }
    
    # Add audio codec parameter only if we have audio
    if audio is not None:
        video_params['audio_codec'] = 'aac'
    
    final_video.write_videofile(
        args.output_path,
        **video_params
    )
    
    print(f"Video creation completed in {time.time() - start_time:.2f} seconds")
    print(f"Final video duration: {duration_sec:.2f} seconds")

    # Once done, remove the dir containing the images with all its content
    if os.path.exists(args.folder_path):
        shutil.rmtree(args.folder_path)

if __name__ == "__main__":
    main()

# Test avec img de fond : 
# py video_creator.py "F:\Programmation\tauri\QuranCaption-2\src-tauri\target\debug\export\3" "F:\Annexe\Montage vidéo\quran.al.luhaidan\88\audio_3541.webm" 300 0 32000 "./output.mp4" 0.25 0.25 0 "F:\Annexe\Montage vidéo\quran.al.luhaidan\bg sky.png"

# test avec video de fond :
# py video_creator.py "F:\Programmation\tauri\QuranCaption-2\src-tauri\target\debug\export\3" "F:\Annexe\Montage vidéo\quran.al.luhaidan\88\audio_3541.webm" 300 0 32000 "./output.mp4" 0.25 0.25 0 "F:\Annexe\Montage vidéo\quran.al.luhaidan\98\video_2476.mp4"

# test sans fond : 
# py video_creator.py "F:\Programmation\tauri\QuranCaption-2\src-tauri\target\debug\export\3" "F:\Annexe\Montage vidéo\quran.al.luhaidan\88\audio_3541.webm" 300 0 0 "./output.mp4" 0.25 0.25 0 ""