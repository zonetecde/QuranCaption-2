// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::os::windows::process::CommandExt;
use std::process::Command;
use std::{ format, vec };
use font_kit::{error::SelectionError, source::SystemSource};
use tauri::Manager; // Ajouté pour permettre l'émission d'événements

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_video_duration, all_families, get_file_content, do_file_exist, download_youtube_video, path_to_executable, create_video, open,close])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn get_file_content(path: String) -> Result<String, String> {
  // read file content
  let content = std::fs::read_to_string(&path).unwrap();
  Ok(content)
}

#[tauri::command]
fn get_video_duration(path: String, app_handle: tauri::AppHandle) -> Result<i32, String> {
    // wait for the file to be not used by another process
    std::thread::sleep(std::time::Duration::from_secs(1));

    let path_resolver: tauri::PathResolver = app_handle.path_resolver();

 // Attempt to resolve the path to the bundled 'ffprobe' binary
 match path_resolver.resolve_resource("binaries/ffprobe") {
    Some(ffprobe_path) => {
  // get video duration
  let output = Command::new(ffprobe_path)
    .arg("-v")
    .arg("error")
    .arg("-show_entries")
    .arg("format=duration")
    .arg("-of")
    .arg("default=noprint_wrappers=1:nokey=1")
    .arg(&path)
    .output()
    .expect("failed to execute process");
   
   // convert output to string
    let duration = String::from_utf8_lossy(&output.stdout);
    // remove new line
    let duration = duration.trim().parse::<f64>().unwrap_or(0.0);

  // to ms
  let duration = duration * 1000.0;
  Ok(duration as i32)
    },
    None => {
        // Handle the case where the path could not be resolved
        Err("Failed to resolve ffprobe path".to_string())
    }
  }
}

#[tauri::command]
async fn all_families() -> Vec<std::string::String> {
     //Create a system font source
     let source = SystemSource::new();

     // Get all fonts in the system
     let fonts: Result<Vec<String>, SelectionError> = source.all_families();

     //return font
     if let Ok(font) = fonts {
         font
     } else {
         vec![]
     }
}

#[tauri::command]
async fn do_file_exist(path: String) -> bool {
  std::path::Path::new(&path).exists()
}

#[tauri::command]
async fn download_youtube_video(format: String, url: String, path: String, app_handle: tauri::AppHandle) -> bool {
    let format_flag = match format.as_str() {
        "webm" => {
            // Specify constant bitrate for WebM audio (example: 192kbps)
            vec!["--format", "bestaudio[ext=webm]", "--audio-quality", "192K", "--postprocessor-args", "-c:a libopus -b:a 192k -vbr off"]
        },
        "mp4" => {
            vec!["--format", "mp4"]
        },
        _ => {
            println!("Invalid format specified. Only 'webm' is supported.");
            return false;
        }
    };

    let mut args = vec!["--force-ipv4"];
    args.extend(format_flag);
    args.push("-o");
    args.push(&path);
    args.push(&url);

    let path_resolver = app_handle.path_resolver();

    // Attempt to resolve the path to the bundled 'ffprobe' binary
    match path_resolver.resolve_resource("binaries/yt-dlp") {
       Some(ytdlp_path) => {

    let output = Command::new(ytdlp_path)
        .args(&args)
        .output();

    match output {
        Ok(output) => {
            let output_str = String::from_utf8_lossy(&output.stdout);
            println!("{}", output_str);
            true
        }
        Err(e) => {
            println!("Failed to execute process: {}", e);
            false
        }
    }
         },
         None => {
              // Handle the case where the path could not be resolved
              println!("Failed to resolve yt-dlp path");
              false
         }
     }
}

#[tauri::command]
fn path_to_executable() -> Result<String, String> {
    // Get the current executable path
    match std::env::current_exe() {
        Ok(exe_path) => {
            // Remove the executable file name and convert to string
            match exe_path.parent() {
                Some(parent_path) => {
                    let mut path_str = parent_path.to_str().unwrap_or("").to_string();
                    if !path_str.ends_with(std::path::MAIN_SEPARATOR) {
                        path_str.push(std::path::MAIN_SEPARATOR);
                    }
                    Ok(path_str)
                }
                None => Err("Failed to get parent directory of executable".to_string()),
            }
        }
        Err(e) => {
            // Return an error message if the path cannot be determined
            Err(format!("Failed to get executable path: {}", e))
        }
    }
}

#[tauri::command]
async fn create_video(
    export_id: i32,
    folder_path: String,
    audio_path: String,
    transition_ms: i32,
    start_time: i32,
    end_time: i32,
    output_path: String,
    top_ratio: f32,
    bottom_ratio: f32,
    dynamic_top: bool,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let path_resolver: tauri::PathResolver = app_handle.path_resolver();

    // Attempt to resolve the path to the bundled 'video_creator' binary
    match path_resolver.resolve_resource("binaries/video_creator") {
        Some(video_creator_path) => {
            // Construct the arguments
            let cmd_args = vec![
                folder_path.clone(),
                audio_path.clone(),
                transition_ms.to_string(),
                start_time.to_string(),
                end_time.to_string(),
                output_path.clone(),
                top_ratio.to_string(),
                bottom_ratio.to_string(),
                if dynamic_top { "1".to_string() } else { "0".to_string() },
            ];

            // Execute the command in the background and capture output
            let mut command = std::process::Command::new(video_creator_path);
            command.args(&cmd_args);
            
            // Configure to capture stdout
            command.stdout(std::process::Stdio::piped());

            #[cfg(target_os = "windows")]
            {
                command.creation_flags(0x08000000); // CREATE_NO_WINDOW
            }

            // Start the process
            let mut child = command
                .spawn()
                .map_err(|e| format!("Error while starting process: {}", e))?;
            
            // Get stdout handle
            if let Some(stdout) = child.stdout.take() {
                use std::io::{BufRead, BufReader};
                use regex::Regex;
                
                // Regex to extract percentage
                let re = Regex::new(r"percentage:\s*(\d+)%").unwrap();
                
                // Create a buffered reader
                let reader = BufReader::new(stdout);
                
                // Read line by line
                for line in reader.lines() {
                    if let Ok(line) = line {
                        println!("Output: {}", line);
                        
                        // Try to find percentage in the line
                        if let Some(caps) = re.captures(&line) {
                            if let Some(percentage_match) = caps.get(1) {
                                if let Ok(percentage) = percentage_match.as_str().parse::<i32>() {
                                    // Emit event with current progress
                                    let payload = serde_json::json!({
                                        "exportId": export_id,
                                        "progress": percentage,
                                        "status": "Exporting video..."
                                    });
                                    let _ = app_handle.emit_all("updateExportDetailsById", payload);
                                }
                            }
                        }
                    }
                }
            }
            
            // Wait for process to complete
            let status = child
                .wait()
                .map_err(|e| format!("Error while waiting for process: {}", e))?;

            if status.success() {
                // Emit an event to notify the frontend that the export is complete
                let payload = serde_json::json!({
                    "exportId": export_id,
                    "progress": 100,
                    "status": "Exported"
                });
                let _ = app_handle.emit_all("updateExportDetailsById", payload);
                Ok("Video creation process completed successfully.".to_string())
            } else {
                Err("Video creation process failed.".to_string())
            }
        },
        None => {
            // Handle the case where the path could not be resolved
            Err("Failed to resolve video_creator path".to_string())
        }
    }
}

#[tauri::command]
async fn open(path: String) {
    let path = std::path::Path::new(&path);
    let dir_path = if path.is_file() {
        path.parent().unwrap_or(path)
    } else {
        path
    };

    // Open the directory or file location using the default file explorer
    if let Err(e) = std::process::Command::new("explorer").arg(dir_path).spawn() {
        eprintln!("Failed to open directory or file location: {}", e);
    }
}

#[tauri::command]
fn close() {
    // Close the application
    std::process::exit(0);
}