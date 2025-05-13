import os
import re
import argparse
import subprocess
import tempfile
import shutil
from PIL import Image

def create_video_from_images(folder_path, audio_path, transition_ms):
    """
    Creates a video from images in a folder with timing information in filenames.
    Ensures proper timing and fade transitions.
    """
    # Convert transition from ms to seconds
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
        print("Aucune image trouvée avec le bon format de nom.")
        return
    
    print(f"Trouvé {len(image_data)} images à inclure dans la vidéo.")
    
    # Get total duration from the last image's end time
    total_duration = image_data[-1]['end_time']
    print(f"Durée totale estimée: {total_duration:.2f} secondes")
    
    # Create a temporary directory for our intermediate files
    temp_dir = tempfile.mkdtemp()
    try:
        # Create static image segments first
        segment_files = []
        
        for i, data in enumerate(image_data):
            img_path = data['path']
            start_time = data['start_time']
            end_time = data['end_time']
            duration = end_time - start_time
            
            segment_file = os.path.join(temp_dir, f"segment_{i:04d}.mp4")
            
            # Create a video segment from this image with exact duration
            cmd = [
                'ffmpeg',
                '-y',
                '-loop', '1',
                '-i', img_path,
                '-c:v', 'libx264',
                '-t', str(duration),
                '-pix_fmt', 'yuv420p',
                '-vf', 'fps=30',
                '-preset', 'veryfast',
                segment_file
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            segment_files.append(segment_file)
        
        # Create a file list for concatenation with proper timing
        concat_file = os.path.join(temp_dir, "concat.txt")
        with open(concat_file, 'w') as f:
            for i, data in enumerate(image_data):
                f.write(f"file '{segment_files[i]}'\n")
                # Set the inpoint - important for proper timing alignment
                f.write(f"inpoint 0\n")
                # Set outpoint (duration)
                f.write(f"outpoint {data['end_time'] - data['start_time']}\n")
        
        # Create intermediate video without audio and transitions
        base_video = os.path.join(temp_dir, "base_video.mp4")
        cmd = [
            'ffmpeg',
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_file,
            '-c', 'copy',
            base_video
        ]
        subprocess.run(cmd, check=True)
        
        # Now create a filter complex to add fade transitions
        filter_complex = []
        for i in range(len(image_data)):
            filter_complex.append(f"[0:v]trim=start={image_data[i]['start_time']}:end={image_data[i]['end_time']},setpts=PTS-STARTPTS[v{i}];")
        
        # Add fade in/out filters
        for i in range(len(image_data)):
            if i > 0:
                # Add fade in if not the first clip
                overlap_start = image_data[i]['start_time']
                filter_complex[-1] = filter_complex[-1][:-1] + f",fade=type=in:start_time=0:duration={transition_sec}[v{i}];"
            
            if i < len(image_data) - 1:
                # Add fade out if not the last clip
                fade_start = image_data[i]['end_time'] - transition_sec
                relative_fade_start = image_data[i]['end_time'] - image_data[i]['start_time'] - transition_sec
                filter_complex[-1] = filter_complex[-1][:-1] + f",fade=type=out:start_time={relative_fade_start}:duration={transition_sec}[v{i}];"
        
        # Add overlay commands for transitions
        overlay_commands = []
        for i in range(len(image_data)):
            if i == 0:
                overlay_commands.append(f"[v{i}]")
            else:
                # Calculate exact overlay time
                overlay_commands.append(f"[tmp{i-1}][v{i}]overlay=shortest=1:eof_action=pass[tmp{i}];")
        
        # Fix the last overlay command
        if len(image_data) > 1:
            overlay_commands[-1] = overlay_commands[-1].replace(f"[tmp{len(image_data)-1}]", "[outv]")
        else:
            overlay_commands[-1] += "[outv]"
        
        # Build the final filter complex
        filter_str = ''.join(filter_complex) + ''.join(overlay_commands)
        
        # Final output with audio
        output_path = os.path.join(folder_path, "output_video.mp4")
        
        # Create a silent video with the right timing and transitions
        temp_video_path = os.path.join(temp_dir, "temp_video.mp4")
        
        # Instead of the complex filter approach, we'll use a simpler xfade filter chain
        # First, prepare each segment with the exact duration
        segments_with_timing = []
        for i, data in enumerate(image_data):
            segment_file = os.path.join(temp_dir, f"timed_segment_{i:04d}.mp4")
            cmd = [
                'ffmpeg',
                '-y',
                '-loop', '1',
                '-i', data['path'],
                '-c:v', 'libx264',
                '-t', str(data['end_time'] - data['start_time']),
                '-pix_fmt', 'yuv420p',
                '-vf', 'fps=30',
                '-preset', 'veryfast',
                segment_file
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            segments_with_timing.append({
                'file': segment_file,
                'start': data['start_time'],
                'end': data['end_time']
            })
        
        # Create a complex filtergraph to handle timing and transitions
        filterscript_path = os.path.join(temp_dir, "filter.txt")
        with open(filterscript_path, 'w') as f:
            inputs = []
            for i in range(len(segments_with_timing)):
                inputs.append(f"[{i}:v]setpts=PTS+{segments_with_timing[i]['start']}/TB[v{i}];")
            
            f.write(''.join(inputs))
            
            # Create the xfade transitions and chain them
            last_output = "v0"
            for i in range(1, len(segments_with_timing)):
                curr_start = segments_with_timing[i]['start']
                # Calculate exact transition timing
                transition_start = curr_start - transition_sec/2
                f.write(f"[{last_output}][v{i}]xfade=transition=fade:duration={transition_sec}:offset={transition_start}[v{i}out];")
                last_output = f"v{i}out"
            
            # Mark the final output
            if len(segments_with_timing) > 1:
                f.write(f"[{last_output}]")
            else:
                f.write("[v0]")
        
        # Use a different approach - create each segment with proper timing, then combine with concat filter
        concat_list_path = os.path.join(temp_dir, "segments.txt")
        with open(concat_list_path, 'w') as f:
            for idx, data in enumerate(image_data):
                duration = data['end_time'] - data['start_time']
                segment_file = os.path.join(temp_dir, f"segment_{idx:04d}.mp4")
                # Create silent video with exact timing
                fade_in = "fade=in:st=0:d=" + str(transition_sec) if idx > 0 else "null"
                fade_out = "fade=out:st=" + str(duration - transition_sec) + ":d=" + str(transition_sec) if idx < len(image_data) - 1 else "null"
                
                cmd = [
                    'ffmpeg',
                    '-y',
                    '-loop', '1',
                    '-i', data['path'],
                    '-c:v', 'libx264',
                    '-t', str(duration),
                    '-pix_fmt', 'yuv420p',
                    '-vf', f"fps=30,{fade_in},{fade_out}",
                    '-preset', 'veryfast',
                    segment_file
                ]
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                f.write(f"file '{segment_file}'\n")
        
        # Concatenate all segments
        silent_video = os.path.join(temp_dir, "silent_video.mp4")
        cmd = [
            'ffmpeg',
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_list_path,
            '-c', 'copy',
            silent_video
        ]
        subprocess.run(cmd, check=True)
        
        # Finally add audio
        cmd = [
            'ffmpeg',
            '-y',
            '-i', silent_video,
            '-i', audio_path,
            '-map', '0:v',
            '-map', '1:a',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-shortest',
            output_path
        ]
        subprocess.run(cmd, check=True)
        
        print(f"Vidéo créée avec succès: {output_path}")
    
    finally:
        # Clean up
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Créer une vidéo à partir d'images avec informations temporelles")
    parser.add_argument("folder_path", help="Chemin vers le dossier contenant les images PNG")
    parser.add_argument("audio_path", help="Chemin vers le fichier audio")
    parser.add_argument("transition_ms", type=int, help="Durée de transition en millisecondes")
    
    args = parser.parse_args()
    
    create_video_from_images(args.folder_path, args.audio_path, args.transition_ms)