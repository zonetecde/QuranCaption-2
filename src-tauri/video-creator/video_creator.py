import os
import re
import argparse
import subprocess
import tempfile
import shutil
import sys
from PIL import Image
import platform
import multiprocessing
from functools import partial
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed

# Ajouter le support pour PyInstaller ici
if hasattr(sys, 'frozen'):
    # Nous sommes dans une version compilée avec PyInstaller
    multiprocessing.freeze_support()

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

def create_black_segment(ffmpeg_path, temp_dir, log_file, width, height, duration, output_file=None):
    """Create a black video segment with the specified duration"""
    if output_file is None:
        output_file = os.path.join(temp_dir, f"black_segment.mp4")
    
    cmd = [
        ffmpeg_path,
        '-y',
        '-f', 'lavfi',
        '-i', f'color=black:s={width}x{height}',
        '-c:v', 'libx264',
        '-t', str(duration),
        '-pix_fmt', 'yuv420p',
        '-preset', 'veryfast',
        output_file
    ]
    with open(log_file, 'a') as f:
        subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
    return output_file

def process_image_segment(ffmpeg_path, img_path, duration, output_file, vf_args, log_file):
    """Helper function to process a single video segment for an image"""
    cmd = [
        ffmpeg_path,
        '-y',
        '-loop', '1',
        '-i', img_path,
        '-vf', vf_args,
        '-c:v', 'libx264',
        '-t', str(duration),
        '-pix_fmt', 'yuv420p',
        '-preset', 'veryfast',
        output_file
    ]
    with open(log_file, 'a') as f:
        subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
    return output_file

def process_image_full(params):
    """Process a complete image with no sectioning in parallel"""
    ffmpeg_path, temp_dir, log_file, i, data, transition_sec, total_images = params
    
    print(f"Processing image {i+1}/{total_images}: {data['file']} ({data['start_time']}s - {data['end_time']}s)")
    img_path = data['path']
    duration = data['end_time'] - data['start_time']
    
    # Create video segment with fade effects directly
    segment_file = os.path.join(temp_dir, f"segment_{i:04d}.mp4")
    fade_in = "fade=in:st=0:d=" + str(transition_sec) if i > 0 else "null"
    fade_out = "fade=out:st=" + str(max(0, duration - transition_sec)) + ":d=" + str(transition_sec) if i < total_images - 1 else "null"
    
    vf_args = f'fps=30,{fade_in},{fade_out}'
    process_image_segment(ffmpeg_path, img_path, duration, segment_file, vf_args, log_file)
    
    return segment_file

def process_section_with_transition(params):
    """Process a section of an image with fade effects"""
    ffmpeg_path, temp_dir, log_file, i, data, section_type, height, y_offset, width, transition_sec, total_images = params
    
    print(f"Processing {section_type} section of image {i+1}/{total_images}: {data['file']} ({data['start_time']}s - {data['end_time']}s)")
    img_path = data['path']
    duration = data['end_time'] - data['start_time']
    
    # Create section with fade effects
    section_file = os.path.join(temp_dir, f"{section_type}_{i:04d}.mp4")
    fade_in = "fade=in:st=0:d=" + str(transition_sec) if i > 0 else "null"
    fade_out = "fade=out:st=" + str(max(0, duration - transition_sec)) + ":d=" + str(transition_sec) if i < total_images - 1 else "null"
    vf_args = f'crop={width}:{height}:0:{y_offset},fps=30,{fade_in},{fade_out}'
    process_image_segment(ffmpeg_path, img_path, duration, section_file, vf_args, log_file)
    
    return (i, section_file, duration)

def process_middle_section(params):
    """Process only the middle section of an image with fade effects"""
    ffmpeg_path, temp_dir, log_file, i, data, top_height, middle_height, width, transition_sec, total_images = params
    
    # Use the more generic function with middle-specific parameters
    return process_section_with_transition(
        (ffmpeg_path, temp_dir, log_file, i, data, "middle", middle_height, top_height, width, transition_sec, total_images)
    )

def process_top_section(params):
    """Process the top section of an image without fade effects (when not static)"""
    ffmpeg_path, temp_dir, log_file, i, data, top_height, width, transition_sec, total_images = params
    
    print(f"Processing top section of image {i+1}/{total_images}: {data['file']} ({data['start_time']}s - {data['end_time']}s)")
    img_path = data['path']
    duration = data['end_time'] - data['start_time']
    
    # Create top section without fade effects
    section_file = os.path.join(temp_dir, f"top_{i:04d}.mp4")
    # No fade effects for top section, even when dynamic
    vf_args = f'crop={width}:{top_height}:0:0,fps=30'
    process_image_segment(ffmpeg_path, img_path, duration, section_file, vf_args, log_file)
    
    return (i, section_file, duration)

def create_static_section(ffmpeg_path, temp_dir, log_file, img_path, width, height, y_pos, section_name, total_duration):
    """Create a static video section (top or bottom) that spans the entire video duration"""
    print(f"Creating static {section_name} section for the entire video duration...")
    section_file = os.path.join(temp_dir, f"{section_name}_static.mp4")
    vf_args = f'crop={width}:{height}:0:{y_pos},fps=30'
    
    # Optimized approach: create shorter video then use stream copy to extend it
    short_duration = min(5.0, total_duration)  # Use a short sample (5 seconds or less if total duration is shorter)
    temp_section = os.path.join(temp_dir, f"{section_name}_temp.mp4")
    
    # Create a short segment first
    cmd = [
        ffmpeg_path,
        '-y',
        '-loop', '1',
        '-i', img_path,
        '-vf', vf_args,
        '-c:v', 'libx264',
        '-t', str(short_duration),
        '-pix_fmt', 'yuv420p',
        '-preset', 'veryfast',
        temp_section
    ]
    with open(log_file, 'a') as f:
        subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
    
    # Now loop this segment to reach the required duration using stream copy (much faster)
    # Use the concat demuxer for more efficient handling of static content
    concat_txt = os.path.join(temp_dir, f"{section_name}_concat.txt")
    repeats = int(total_duration / short_duration) + 1  # +1 to ensure we have enough duration
    
    with open(concat_txt, 'w') as f:
        for _ in range(repeats):
            f.write(f"file '{temp_section}'\n")
    
    cmd = [
        ffmpeg_path,
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concat_txt,
        '-c', 'copy',
        '-t', str(total_duration),
        section_file
    ]
    with open(log_file, 'a') as f:
        subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
    
    # Remove the temporary file
    try:
        os.remove(temp_section)
        os.remove(concat_txt)
    except:
        pass  # Ignore any errors during cleanup
        
    return section_file

def process_image_sections(params):
    """Process an image with sectioning in parallel - LEGACY FUNCTION, kept for compatibility"""
    ffmpeg_path, temp_dir, log_file, i, data, top_height, middle_height, bottom_height, width, transition_sec, total_images = params
    
    print(f"Processing image {i+1}/{total_images}: {data['file']} ({data['start_time']}s - {data['end_time']}s)")
    img_path = data['path']
    duration = data['end_time'] - data['start_time']
    
    section_files = []
    
    # Create top section (remains intact) - only if top_ratio > 0
    if top_height > 0:
        top_section = os.path.join(temp_dir, f"top_{i:04d}.mp4")
        vf_args = f'crop={width}:{top_height}:0:0,fps=30'
        process_image_segment(ffmpeg_path, img_path, duration, top_section, vf_args, log_file)
        section_files.append(top_section)
    
    # Create middle section (with fade effects)
    middle_section = os.path.join(temp_dir, f"middle_{i:04d}.mp4")
    fade_in = "fade=in:st=0:d=" + str(transition_sec) if i > 0 else "null"
    fade_out = "fade=out:st=" + str(max(0, duration - transition_sec)) + ":d=" + str(transition_sec) if i < total_images - 1 else "null"
    vf_args = f'crop={width}:{middle_height}:0:{top_height},fps=30,{fade_in},{fade_out}'
    process_image_segment(ffmpeg_path, img_path, duration, middle_section, vf_args, log_file)
    section_files.append(middle_section)
    
    # Create bottom section (remains intact) - only if bottom_ratio > 0
    if bottom_height > 0:
        bottom_section = os.path.join(temp_dir, f"bottom_{i:04d}.mp4")
        vf_args = f'crop={width}:{bottom_height}:0:{top_height + middle_height},fps=30'
        process_image_segment(ffmpeg_path, img_path, duration, bottom_section, vf_args, log_file)
        section_files.append(bottom_section)
    
    return (i, section_files, duration)

def combine_with_static_sections(ffmpeg_path, temp_dir, log_file, middle_data, static_top, static_bottom, top_height, bottom_height):
    """Combine middle sections with static top and bottom sections"""
    print("Combining middle sections with static top and bottom sections...")
    segment_files = []
    
    for i, (middle_section, duration) in middle_data:
        segment_file = os.path.join(temp_dir, f"segment_{i:04d}.mp4")
        
        # Determine input sections based on what exists
        inputs = []
        filter_complex = ""
        
        if top_height > 0 and bottom_height > 0:
            # Need to trim static sections to match this segment's duration
            top_trimmed = os.path.join(temp_dir, f"top_trimmed_{i:04d}.mp4")
            bottom_trimmed = os.path.join(temp_dir, f"bottom_trimmed_{i:04d}.mp4")
            
            # Trim top section
            trim_cmd = [
                ffmpeg_path, '-y',
                '-ss', str(0),  # Start from beginning of static file
                '-i', static_top,
                '-t', str(duration),
                '-c', 'copy',
                top_trimmed
            ]
            with open(log_file, 'a') as f:
                subprocess.run(trim_cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
            
            # Trim bottom section
            trim_cmd = [
                ffmpeg_path, '-y',
                '-ss', str(0),  # Start from beginning of static file
                '-i', static_bottom,
                '-t', str(duration),
                '-c', 'copy',
                bottom_trimmed
            ]
            with open(log_file, 'a') as f:
                subprocess.run(trim_cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
            
            # Stack all three sections
            filter_complex = "[0:v][1:v]vstack=inputs=2[temp];[temp][2:v]vstack=inputs=2[outv]"
            cmd = [
                ffmpeg_path, '-y',
                '-i', top_trimmed,
                '-i', middle_section,
                '-i', bottom_trimmed,
                '-filter_complex', filter_complex,
                '-map', '[outv]',
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-t', str(duration),
                segment_file
            ]
        elif top_height > 0:
            # Only top and middle sections
            top_trimmed = os.path.join(temp_dir, f"top_trimmed_{i:04d}.mp4")
            
            # Trim top section
            trim_cmd = [
                ffmpeg_path, '-y',
                '-ss', str(0),
                '-i', static_top,
                '-t', str(duration),
                '-c', 'copy',
                top_trimmed
            ]
            with open(log_file, 'a') as f:
                subprocess.run(trim_cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
                
            filter_complex = "[0:v][1:v]vstack=inputs=2[outv]"
            cmd = [
                ffmpeg_path, '-y',
                '-i', top_trimmed,
                '-i', middle_section,
                '-filter_complex', filter_complex,
                '-map', '[outv]',
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-t', str(duration),
                segment_file
            ]
        elif bottom_height > 0:
            # Only middle and bottom sections
            bottom_trimmed = os.path.join(temp_dir, f"bottom_trimmed_{i:04d}.mp4")
            
            # Trim bottom section
            trim_cmd = [
                ffmpeg_path, '-y',
                '-ss', str(0),
                '-i', static_bottom,
                '-t', str(duration),
                '-c', 'copy',
                bottom_trimmed
            ]
            with open(log_file, 'a') as f:
                subprocess.run(trim_cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
                
            filter_complex = "[0:v][1:v]vstack=inputs=2[outv]"
            cmd = [
                ffmpeg_path, '-y',
                '-i', middle_section,
                '-i', bottom_trimmed,
                '-filter_complex', filter_complex,
                '-map', '[outv]',
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-t', str(duration),
                segment_file
            ]
        else:
            # Only middle section (no stacking needed)
            shutil.copy2(middle_section, segment_file)
            cmd = None
        
        if cmd:
            with open(log_file, 'a') as f:
                subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
        
        segment_files.append(segment_file)
    
    return segment_files

def combine_sections(ffmpeg_path, temp_dir, log_file, i, sections_data, top_height, bottom_height):
    """Combine the sections of an image into a single segment - LEGACY FUNCTION, kept for compatibility"""
    section_files, duration = sections_data
    segment_file = os.path.join(temp_dir, f"segment_{i:04d}.mp4")
    
    # Build different filter complexes based on which sections exist
    if top_height > 0 and bottom_height > 0 and len(section_files) == 3:
        # All three sections exist
        filter_complex = (
            f"[0:v][1:v]vstack=inputs=2[temp];"
            f"[temp][2:v]vstack=inputs=2[outv]"
        )
        cmd = [
            ffmpeg_path,
            '-y',
            '-i', section_files[0],  # top
            '-i', section_files[1],  # middle
            '-i', section_files[2],  # bottom
            '-filter_complex', filter_complex,
            '-map', '[outv]',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-t', str(duration),
            segment_file
        ]
    elif top_height > 0 and len(section_files) == 2:
        # Only top and middle sections
        filter_complex = "[0:v][1:v]vstack=inputs=2[outv]"
        cmd = [
            ffmpeg_path,
            '-y',
            '-i', section_files[0],  # top
            '-i', section_files[1],  # middle
            '-filter_complex', filter_complex,
            '-map', '[outv]',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-t', str(duration),
            segment_file
        ]
    elif bottom_height > 0 and len(section_files) == 2:
        # Only middle and bottom sections
        filter_complex = "[0:v][1:v]vstack=inputs=2[outv]"
        cmd = [
            ffmpeg_path,
            '-y',
            '-i', section_files[0],  # middle
            '-i', section_files[1],  # bottom
            '-filter_complex', filter_complex,
            '-map', '[outv]',
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-t', str(duration),
            segment_file
        ]
    else:
        # Only middle section (no stacking needed)
        shutil.copy2(section_files[0], segment_file)
        return segment_file
    
    with open(log_file, 'a') as f:
        subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
    return segment_file

def create_video_from_images(folder_path, audio_path, transition_ms, start_time_ms=0, end_time_ms=0, output_path=None, top_ratio=0.2, bottom_ratio=0.2, is_top_section_static=True):
    """
    Creates a video from images in a folder with timing information in filenames.
    Applies fade transition only to the middle section of the image height.
    
    Parameters:
    - folder_path: Path to folder containing PNG images
    - audio_path: Path to audio file
    - transition_ms: Transition duration in milliseconds
    - start_time_ms: Start time in milliseconds (0 = start at the beginning)
      Si start_time > 0, la vidéo commencera directement à ce temps, en supprimant tout le contenu avant
    - end_time_ms: End time in milliseconds (0 = until the end)
      Si end_time > 0, seules les images pertinentes jusqu'à ce point seront traitées
    - output_path: Custom output path (None = default path in folder)
    - top_ratio: Ratio of image height for the top section (default: 0.2 or 20%, 0 = no top section)
    - bottom_ratio: Ratio of image height for the bottom section (default: 0.2 or 20%, 0 = no bottom section)
    - is_top_section_static: If True, only process the top section once for all images. If False, process top section for each image but without applying fade transitions (default: True)
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
    
    # Convertir start_time_ms et end_time_ms en secondes pour faciliter les comparaisons
    start_time_sec = start_time_ms / 1000.0 if start_time_ms > 0 else 0
    end_time_sec = end_time_ms / 1000.0 if end_time_ms > 0 else float('inf')
    
    # Filtrer les images pertinentes en fonction du start_time et end_time
    # Une image est pertinente si:
    # - Elle commence avant end_time ET se termine après start_time
    # Ou en d'autres termes, si elle n'est pas complètement en dehors de la plage [start_time, end_time]
    relevant_image_data = []
    
    for img in image_data:
        # L'image est pertinente si elle n'est pas entièrement avant start_time ou après end_time
        if not (img['end_time'] <= start_time_sec or (end_time_sec != float('inf') and img['start_time'] >= end_time_sec)):
            relevant_image_data.append(img)
    
    # Remplacer la liste complète par la liste filtrée
    original_count = len(image_data)
    image_data = relevant_image_data
    
    if not image_data:
        print(f"No images found within the specified time range ({start_time_ms}ms to {end_time_ms if end_time_ms > 0 else 'end'}ms).")
        return 1
    
    print(f"Found {original_count} images in total, {len(image_data)} images are relevant for the specified time range.")
    
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
        
        # Determine the number of CPU cores to use
        # Use up to 75% of available cores, with at least 1 and at most 8
        num_cores = max(1, min(8, int(multiprocessing.cpu_count() * 0.75)))
        print(f"Using {num_cores} CPU cores for parallel processing")
        
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
          # Calculate total video duration
        total_duration = image_data[-1]['end_time'] - image_data[0]['start_time']
          # Process images
        if not use_sectioning:
            print("No sectioning: creating video segments in parallel...")
            
            # Version compatible avec PyInstaller - utilisation de ThreadPoolExecutor au lieu de ProcessPoolExecutor
            segment_files = []
            
            if hasattr(sys, 'frozen'):
                # Mode compilé: pas de parallélisation pour éviter les problèmes avec PyInstaller
                print("Running in compiled mode: using sequential processing instead of parallel processing")
                params = [(ffmpeg_path, temp_dir, log_file, i, data, transition_sec, len(image_data)) 
                        for i, data in enumerate(image_data)]
                segment_files = [process_image_full(param) for param in params]
            else:
                # Mode script: parallélisation avec ProcessPoolExecutor
                with ProcessPoolExecutor(max_workers=num_cores) as executor:
                    # Prepare parameters for parallel processing
                    params = [(ffmpeg_path, temp_dir, log_file, i, data, transition_sec, len(image_data)) 
                            for i, data in enumerate(image_data)]
                    
                    # Process all images in parallel and collect results
                    segment_files = list(executor.map(process_image_full, params))
        else:
            if is_top_section_static:
                print("Using optimized sectioning approach with static sections...")
                
                # Create static top section from the first image (if needed)
                static_top = None
                if top_height > 0:
                    static_top = create_static_section(
                        ffmpeg_path, temp_dir, log_file,
                        image_data[0]['path'], width, top_height, 0, "top", total_duration
                    )
                
                # Create static bottom section from the first image (if needed)
                static_bottom = None
                if bottom_height > 0:
                    static_bottom = create_static_section(
                        ffmpeg_path, temp_dir, log_file,
                        image_data[0]['path'], width, bottom_height, top_height + middle_height, "bottom", total_duration
                    )
                  # Process only the middle sections of each image in parallel
                middle_sections = []
                
                if hasattr(sys, 'frozen'):
                    # Mode compilé: pas de parallélisation pour éviter les problèmes avec PyInstaller
                    print("Running in compiled mode: using sequential processing instead of parallel processing")
                    # Prepare parameters
                    params = [(ffmpeg_path, temp_dir, log_file, i, data, 
                            top_height, middle_height, width, 
                            transition_sec, len(image_data))
                            for i, data in enumerate(image_data)]
                    
                    # Process all middle sections sequentially
                    middle_results = [process_middle_section(param) for param in params]
                else:
                    # Mode script: parallélisation avec ProcessPoolExecutor
                    with ProcessPoolExecutor(max_workers=num_cores) as executor:
                        # Prepare parameters for parallel processing
                        params = [(ffmpeg_path, temp_dir, log_file, i, data, 
                                top_height, middle_height, width, 
                                transition_sec, len(image_data))
                                for i, data in enumerate(image_data)]
                        
                        # Process all middle sections in parallel
                        middle_results = list(executor.map(process_middle_section, params))
                
                # Sort results by index to maintain order
                middle_results.sort(key=lambda x: x[0])
                
                # Extract middle sections and durations
                middle_sections = [(i, (section, data['end_time'] - data['start_time'])) 
                                for i, (idx, section, _) in enumerate(middle_results)
                                for data in [image_data[idx]]]
                
                # Combine middle sections with static top and bottom sections
                segment_files = combine_with_static_sections(
                    ffmpeg_path, temp_dir, log_file, 
                    middle_sections, static_top, static_bottom, 
                    top_height, bottom_height
                )
            else:
                print("Processing with dynamic top section (different for each image, but no fade transitions)...")
                
                # Create static bottom section only (if needed)
                static_bottom = None
                if bottom_height > 0:
                    static_bottom = create_static_section(
                        ffmpeg_path, temp_dir, log_file,
                        image_data[0]['path'], width, bottom_height, top_height + middle_height, "bottom", total_duration
                    )
                
                # Process top and middle sections of each image in parallel
                top_results = []
                middle_results = []
                
                with ProcessPoolExecutor(max_workers=num_cores) as executor:
                    # Process both middle and top sections (if top_height > 0)
                    futures = []
                    
                    # Middle section parameters
                    middle_params = [(ffmpeg_path, temp_dir, log_file, i, data, 
                                    top_height, middle_height, width, 
                                    transition_sec, len(image_data))
                                    for i, data in enumerate(image_data)]
                    
                    # Process all middle sections
                    for params in middle_params:
                        futures.append(executor.submit(process_middle_section, params))
                    
                    # If top section exists, process those too
                    if top_height > 0:
                        top_params = [(ffmpeg_path, temp_dir, log_file, i, data,
                                    top_height, width,
                                    transition_sec, len(image_data))
                                    for i, data in enumerate(image_data)]
                        
                        for params in top_params:
                            futures.append(executor.submit(process_top_section, params))
                    
                    # Collect results
                    for future in as_completed(futures):
                        result = future.result()
                        if "middle" in os.path.basename(result[1]):
                            middle_results.append(result)
                        else:
                            top_results.append(result)
                
                # Sort results by index
                middle_results.sort(key=lambda x: x[0])
                if top_height > 0:
                    top_results.sort(key=lambda x: x[0])
                
                # Combine top, middle and static bottom sections for each image
                segment_files = []
                
                for i, (_, middle_section, _) in enumerate(middle_results):
                    segment_file = os.path.join(temp_dir, f"segment_{i:04d}.mp4")
                    duration = image_data[i]['end_time'] - image_data[i]['start_time']
                    
                    if top_height > 0 and bottom_height > 0:
                        # Trim bottom section
                        bottom_trimmed = os.path.join(temp_dir, f"bottom_trimmed_{i:04d}.mp4")
                        trim_cmd = [
                            ffmpeg_path, '-y',
                            '-ss', str(0),
                            '-i', static_bottom,
                            '-t', str(duration),
                            '-c', 'copy',
                            bottom_trimmed
                        ]
                        with open(log_file, 'a') as f:
                            subprocess.run(trim_cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
                            
                        # Stack all three sections
                        filter_complex = "[0:v][1:v]vstack=inputs=2[temp];[temp][2:v]vstack=inputs=2[outv]"
                        cmd = [
                            ffmpeg_path, '-y',
                            '-i', top_results[i][1],
                            '-i', middle_section,
                            '-i', bottom_trimmed,
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
                            ffmpeg_path, '-y',
                            '-i', top_results[i][1],
                            '-i', middle_section,
                            '-filter_complex', filter_complex,
                            '-map', '[outv]',
                            '-c:v', 'libx264',
                            '-preset', 'veryfast',
                            '-t', str(duration),
                            segment_file
                        ]
                    elif bottom_height > 0:
                        # Only middle and bottom sections
                        bottom_trimmed = os.path.join(temp_dir, f"bottom_trimmed_{i:04d}.mp4")
                        trim_cmd = [
                            ffmpeg_path, '-y',
                            '-ss', str(0),
                            '-i', static_bottom,
                            '-t', str(duration),
                            '-c', 'copy',
                            bottom_trimmed
                        ]
                        with open(log_file, 'a') as f:
                            subprocess.run(trim_cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
                            
                        filter_complex = "[0:v][1:v]vstack=inputs=2[outv]"
                        cmd = [
                            ffmpeg_path, '-y',
                            '-i', middle_section,
                            '-i', bottom_trimmed,
                            '-filter_complex', filter_complex,
                            '-map', '[outv]',
                            '-c:v', 'libx264',
                            '-preset', 'veryfast',
                            '-t', str(duration),
                            segment_file
                        ]
                    else:
                        # Only middle section (no stacking needed)
                        shutil.copy2(middle_section, segment_file)
                        cmd = None
                    
                    if cmd:
                        with open(log_file, 'a') as f:
                            subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
                            
                    segment_files.append(segment_file)          # Si start_time > 0, on supprime directement la partie entre 0 et start_time
        # Ajuster le premier segment si nécessaire pour commencer exactement à start_time
        if start_time_ms > 0 and image_data[0]['start_time'] < start_time_sec:
            print(f"Adjusting first segment to start exactly at {start_time_sec:.2f} seconds")
            # Dans ce cas, on doit couper la première image pour qu'elle commence à start_time_sec
            first_img_adjusted = os.path.join(temp_dir, "first_segment_adjusted.mp4")
            offset = start_time_sec - image_data[0]['start_time']
            
            # Ne pas utiliser -c copy car cela peut causer des problèmes avec la position d'offset exacte
            # Au lieu de cela, réencoder cette partie pour garantir que le fichier est valide
            cmd = [
                ffmpeg_path,
                '-y',
                '-i', segment_files[0],  # Le premier segment d'image est toujours à l'index 0 car on n'ajoute plus de segment noir
                '-ss', str(offset),
                '-c:v', 'libx264',  # Réencoder au lieu de simplement copier
                '-preset', 'veryfast',
                '-pix_fmt', 'yuv420p',
                first_img_adjusted
            ]
            with open(log_file, 'a') as f:
                subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
            
            # Vérifier si le fichier ajusté est valide avant de l'utiliser
            if os.path.exists(first_img_adjusted) and os.path.getsize(first_img_adjusted) > 1000:
                # Remplacer le premier segment par le segment ajusté
                segment_files[0] = first_img_adjusted
            else:
                print("Warning: Adjusted segment is invalid, using original segment instead.")
          # Vérifier que tous les segments sont valides avant de les concaténer
        valid_segments = []
        for segment_file in segment_files:
            if os.path.exists(segment_file) and os.path.getsize(segment_file) > 1000:
                valid_segments.append(segment_file)
            else:
                print(f"Warning: Skipping invalid segment: {os.path.basename(segment_file)}")
        
        if not valid_segments:
            print("Error: No valid segments found to concatenate!")
            return 1
        
        # Create a concat file to sequence all segments
        concat_list_path = os.path.join(temp_dir, "segments.txt")
        with open(concat_list_path, 'w') as f:
            for segment_file in valid_segments:
                f.write(f"file '{segment_file}'\n")
        
        print(f"Assembling {len(valid_segments)} valid segments into a complete video...")
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
        
        # Nous n'avons plus besoin de faire de trim, car nous avons déjà sélectionné et ajusté les images pertinentes
        final_output = output_path
        
        # Si une durée de fin a été spécifiée et que la dernière image va au-delà,
        # il peut être nécessaire de faire un trim final
        if end_time_ms > 0 and image_data[-1]['end_time'] > end_time_sec:
            print(f"Applying final trim to match exact end time: {end_time_ms}ms")
            trim_cmd = [
                ffmpeg_path, '-y', 
                '-i', full_video,
                '-t', str(end_time_sec),
                '-c:v', 'copy', '-c:a', 'copy', 
                final_output
            ]
            
            with open(log_file, 'a') as f:
                subprocess.run(trim_cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
        else:
            # Si pas besoin de trim final, simplement copier la vidéo complète
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
            if is_top_section_static:
                print("Optimized processing: static top and bottom sections were created only once!")
            else:
                print("Dynamic top section (changes with each image but no fade effect), bottom section static.")
        else:
            print("Fade was applied to the entire image (no sectioning).")
        if start_time_ms > 0 or end_time_ms > 0:
            print(f"Optimized video generation for time range: {start_time_ms}ms" + (f" to {end_time_ms}ms" if end_time_ms > 0 else " to end"))
            print(f"Only relevant images were processed, and all content before {start_time_ms}ms was removed.")
        
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
    parser.add_argument("top_ratio", type=float,
                        help="Ratio of the height for the top section (0.0 to 0.5)")
    parser.add_argument("bottom_ratio", type=float,
                        help="Ratio of the height for the bottom section (0.0 to 0.5)")
    parser.add_argument("dynamic_top", type=int,
                        help="Set to 1 for dynamic top section (process top section for each image separately, no fade effect), 0 for static top section (default behavior)")
    
    args = parser.parse_args()
    
    return create_video_from_images(
        args.folder_path, 
        args.audio_path, 
        args.transition_ms,
        args.start_time,
        args.end_time,
        args.output_path,
        args.top_ratio,
        args.bottom_ratio,
        not bool(args.dynamic_top)  # 1 → False (dynamic), 0 → True (static)
    )

if __name__ == "__main__":
    sys.exit(main())

# Exemple d'utilisation standard (avec top statique - comportement par défaut):
#py .\video_creator.py F:\Programmation\tauri\QuranCaption-2\src-tauri\target\debug\export\1 C:\Users\zonedetec\downloads\audio_4676.webm 300 0 0 ./output.mp4 0.25 0.25 0

# Exemple avec top section dynamique (ajoutez --dynamic-top):
#py .\video_creator.py C:\Users\zonedetec\Documents\source\tauri\QuranCaption-2\src-tauri\target\debug\export\2 C:\Users\zonedetec\Documents\quran.al.luhaidan\47\audio_2608.webm 300 0 0 ./output.mp4 0.25 0.25 --dynamic-top
