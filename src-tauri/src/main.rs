// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::{ format, vec };
use font_kit::{error::SelectionError, source::SystemSource};

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_video_duration, all_families, get_file_content, do_file_exist, download_youtube_video, path_to_executable])
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

    let path_resolver = app_handle.path_resolver();

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