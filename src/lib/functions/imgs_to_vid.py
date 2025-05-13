# C:\Users\zonedetec\Documents\source\tauri\QuranCaption-2\src-tauri\target\debug\export\907260
# C:\Users\zonedetec\Documents\quran.al.luhaidan\46\audio_9107.webm
# 200
import os
import subprocess
import sys

def parse_filename(filename):
    """Parse filename to extract start and end times in milliseconds."""
    base = os.path.basename(filename)
    name, ext = os.path.splitext(base)
    if ext.lower() != '.png':
        return None
    parts = name.split('_')
    if len(parts) != 2:
        return None
    try:
        start = int(parts[0])
        end = int(parts[1])
    except ValueError:
        return None
    if start >= end:
        return None
    return (start, end)

def main(folder_path, audio_path, transition_ms, output_path):
    # Collect and parse all PNG files in the folder
    images = []
    for filename in os.listdir(folder_path):
        filepath = os.path.join(folder_path, filename)
        times = parse_filename(filepath)
        if times is not None:
            images.append((times[0], times[1], filepath))

    if not images:
        print("No valid PNG files found in the folder.")
        sys.exit(1)

    # Sort images by start time
    images.sort(key=lambda x: x[0])

    # Check for overlapping or invalid times (optional)
    for i in range(1, len(images)):
        prev_end = images[i-1][1]
        curr_start = images[i][0]
        if curr_start < prev_end:
            print(f"Warning: Images {images[i-1][2]} and {images[i][2]} overlap.")

    # Prepare durations and paths
    image_paths = []
    durations_ms = []
    for start, end, path in images:
        durations_ms.append(end - start)
        image_paths.append(path)

    # Check if transition duration is feasible
    transition_sec = transition_ms / 1000.0
    for duration in durations_ms:
        if duration < transition_ms:
            print(f"Error: Image {path} has duration {duration}ms, which is shorter than transition {transition_ms}ms.")
            sys.exit(1)

    # Build ffmpeg command
    cmd = ['ffmpeg', '-y']

    # Add image inputs
    for i, (duration, path) in enumerate(zip(durations_ms, image_paths)):
        duration_sec = duration / 1000.0
        cmd.extend(['-loop', '1', '-t', str(duration_sec), '-i', path])

    # Add audio input
    cmd.extend(['-i', audio_path])

    # Build filter_complex
    filter_parts = []
    if len(image_paths) == 1:
        # No transition needed
        video_map = '0:v'
    else:
        # Construct xfade transitions
        cumulative_duration = 0.0
        prev_output = '0'
        cumulative_duration += durations_ms[0] / 1000.0
        for i in range(1, len(image_paths)):
            offset_sec = cumulative_duration - transition_sec
            if offset_sec < 0:
                print(f"Transition overlap error at image {i}. Adjust transition duration or image durations.")
                sys.exit(1)
            current_input = str(i)
            filter_str = f'[{prev_output}][{current_input}]xfade=transition=fade:duration={transition_sec}:offset={offset_sec}[v{i}]'
            filter_parts.append(filter_str)
            prev_output = f'v{i}'
            cumulative_duration += (durations_ms[i] / 1000.0) - transition_sec

        video_map = f'[{prev_output}]'
        filter_complex = ';'.join(filter_parts)
        cmd.extend(['-filter_complex', filter_complex])

    # Mapping and codec settings
    cmd.extend(['-map', video_map])
    audio_input_index = len(image_paths)
    cmd.extend(['-map', f'{audio_input_index}:a'])
    cmd.extend([
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-strict', 'experimental',
        '-shortest',
        output_path
    ])

    # Execute command
    try:
        subprocess.run(cmd, check=True)
        print(f"Video created successfully at {output_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error occurred while running ffmpeg: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python script.py <folder_path> <audio_path> <transition_ms> <output_path>")
        sys.exit(1)
    folder_path = sys.argv[1]
    audio_path = sys.argv[2]
    transition_ms = int(sys.argv[3])
    output_path = sys.argv[4]
    main(folder_path, audio_path, transition_ms, output_path)