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

def create_video_from_images(folder_path, audio_path, transition_ms, start_time_ms=0, end_time_ms=0, output_path=None):
    """
    Creates a video from images in a folder with timing information in filenames.
    Applies fade transition only to the middle 60% of the image height.
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
        print("Aucune image trouvée avec le bon format de nom.")
        return 1
    
    print(f"Trouvé {len(image_data)} images à inclure dans la vidéo.")
    
    # Set default output path if not provided
    if output_path is None:
        output_path = os.path.join(folder_path, "output_video.mp4")
    
    # Create a temporary directory for our intermediate files
    temp_dir = tempfile.mkdtemp()
    try:
        # First, analyze image dimensions
        print("Analyse des dimensions des images...")
        first_img = Image.open(image_data[0]['path'])
        width, height = first_img.size
        first_img.close()
        
        # Calculate region heights (20% top, 60% middle, 20% bottom)
        # Ensure all heights are even numbers (required for YUV420p)
        top_height = int(height * 0.2) // 2 * 2  # Force even number
        middle_height = int(height * 0.6) // 2 * 2  # Force even number
        bottom_height = height - top_height - middle_height
        if bottom_height % 2 != 0:  # Ensure bottom height is even
            bottom_height -= 1
            middle_height += 1
        
        print(f"Dimensions: {width}x{height}")
        print(f"Zones (ajustées pour être paires): Haut={top_height}px, Milieu={middle_height}px, Bas={bottom_height}px")
        
        # Make sure width is also even
        if width % 2 != 0:
            width -= 1  # Reduce width by 1 if odd
            
        # Create temporary log file for FFmpeg output
        log_file = os.path.join(temp_dir, "ffmpeg_log.txt")
        
        # Prepare intermediate files for each image section
        for i, data in enumerate(image_data):
            print(f"Traitement de l'image {i+1}/{len(image_data)}: {data['file']} ({data['start_time']}s - {data['end_time']}s)")
            img_path = data['path']
            duration = data['end_time'] - data['start_time']
            
            # Create top section (remains intact)
            top_section = os.path.join(temp_dir, f"top_{i:04d}.mp4")
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
            
            # Create bottom section (remains intact)
            bottom_section = os.path.join(temp_dir, f"bottom_{i:04d}.mp4")
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
        print("Combinaison des sections pour chaque image...")
        
        for i, data in enumerate(image_data):
            duration = data['end_time'] - data['start_time']
            
            # Create a filtercomplex to stack the three sections
            segment_file = os.path.join(temp_dir, f"segment_{i:04d}.mp4")
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
            with open(log_file, 'a') as f:
                subprocess.run(cmd, check=True, stdout=f, stderr=subprocess.STDOUT)
            segment_files.append(segment_file)
        
        # Create a concat file to sequence all segments
        concat_list_path = os.path.join(temp_dir, "segments.txt")
        with open(concat_list_path, 'w') as f:
            for segment_file in segment_files:
                f.write(f"file '{segment_file}'\n")
        
        # Concatenate all segments
        print("Assemblage des segments en vidéo complète...")
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
            print(f"Application du trim: début={start_time_ms}ms" + (f", fin={end_time_ms}ms" if end_time_ms > 0 else ""))
            
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
            print(f"Durée finale de la vidéo: {final_duration:.2f} secondes")
        except ValueError:
            print("Impossible de déterminer la durée finale de la vidéo")
        
        print(f"Vidéo créée avec succès: {final_output}")
        print(f"Le fondu a été appliqué uniquement à la partie centrale (60% de la hauteur).")
        if start_time_ms > 0 or end_time_ms > 0:
            print(f"Vidéo trimmée: début à {start_time_ms}ms" + (f" jusqu'à {end_time_ms}ms" if end_time_ms > 0 else ""))
        
        return 0  # Success
    
    except Exception as e:
        print(f"Une erreur s'est produite: {e}")
        print(f"Consultez le journal FFmpeg pour plus de détails: {log_file}")
        return 1  # Error
    
    finally:
        # Don't clean up temp directory if there was an error, so logs can be examined
        if 'log_file' in locals() and os.path.exists(log_file):
            print(f"Le dossier temporaire n'a pas été supprimé pour permettre l'examen des fichiers: {temp_dir}")
        else:
            shutil.rmtree(temp_dir, ignore_errors=True)

def main():
    parser = argparse.ArgumentParser(description="Créer une vidéo à partir d'images avec fondu uniquement au milieu")
    parser.add_argument("folder_path", help="Chemin vers le dossier contenant les images PNG")
    parser.add_argument("audio_path", help="Chemin vers le fichier audio")
    parser.add_argument("transition_ms", type=int, help="Durée de transition en millisecondes")
    parser.add_argument("start_time", type=int, 
                        help="Temps de début pour couper la vidéo finale (en millisecondes, 0 = pas de coupe)")
    parser.add_argument("end_time", type=int, 
                        help="Temps de fin pour couper la vidéo finale (en millisecondes, 0 = jusqu'à la fin)")
    parser.add_argument("output_path", help="Chemin personnalisé pour la vidéo de sortie")
    
    args = parser.parse_args()
    
    return create_video_from_images(
        args.folder_path, 
        args.audio_path, 
        args.transition_ms,
        args.start_time,
        args.end_time,
        args.output_path
    )

if __name__ == "__main__":
    sys.exit(main())

#py .\imgs_to_vid.py C:\Users\zonedetec\Documents\source\tauri\QuranCaption-2\src-tauri\target\debug\export\907260 C:\Users\zonedetec\Documents\quran.al.luhaidan\46\audio_9107.webm 300 5000 7000 ./output.mp4
#video_creator C:\Users\zonedetec\Documents\source\tauri\QuranCaption-2\src-tauri\target\debug\export\907260 C:\Users\zonedetec\Documents\quran.al.luhaidan\46\audio_9107.webm 300 5000 7000 ./output.mp4