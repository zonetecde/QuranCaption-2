// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::{ format, vec };
use font_kit::{error::SelectionError, source::SystemSource};
use std::fs;
use std::time;
use std::process::Stdio;
use std::io::Write;

fn main() {
  tauri::Builder::default()
  
    .invoke_handler(tauri::generate_handler![get_video_duration, all_families, get_file_content, do_file_exist, download_youtube_video, export_video])
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
fn get_video_duration(path: String) -> Result<i32, String> {
    // wait for the file to be not used by another process
    std::thread::sleep(std::time::Duration::from_secs(1));


  // get video duration
  let output = Command::new("./ffprobe")
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
async fn download_youtube_video(format: String, url: String, path: String) -> bool {
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

    let output = Command::new("./yt-dlp")
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
}

#[tauri::command]
async fn export_video() -> Result<(), String> {
    let output_file = "output2024.mp4";
    let temp_file = "temp.mp4";

    // Commande FFmpeg pour capturer l'écran
    let mut record_process = Command::new("./ffmpeg")
    .args([
        "-f", "gdigrab",
        
        "-i", "title=Quran Caption",
        "-y",
        &temp_file
    ])
    .stdin(Stdio::piped())
    .spawn()
    .map_err(|err| format!("Failed to start recording: {}", err))?;

    println!("Recording started...");

    // Simulate 10 second recording
    tauri::async_runtime::spawn(async {
        tokio::time::sleep(time::Duration::from_secs(10)).await;
    }).await.unwrap();

    // Gracefully stop the recording by sending 'q' command
    if let Some(mut stdin) = record_process.stdin.take() {
        stdin.write_all(b"q").map_err(|err| format!("Failed to send stop signal: {}", err))?;
    }

    // Wait for the process to finish
    match record_process.wait() {
        Ok(status) => {
            if status.success() {
                println!("Recording completed successfully");
            } else {
                println!("Recording process exited with status: {}", status);
            }
        }
        Err(err) => eprintln!("Error waiting for recording process: {}", err),
    }

    // supprime l'ancien fichier de sortie s'il existe
    if let Ok(_) = fs::remove_file(output_file) {
        println!("Removed old output file: {}", output_file);
    }

        
    println!("test1");

    // Conversion et nettoyage avec FFmpeg
    let convert_command = format!("-i {} -c:v libx264 {}", temp_file, output_file);
    let convert_status = Command::new("./ffmpeg")
        .args(convert_command.split_whitespace())
        .status()
        .map_err(|err| format!("Failed to execute conversion: {}", err))?;

    if !convert_status.success() {
        return Err(format!(
            "FFmpeg conversion failed with status: {}",
            convert_status
        ));
    }

    // Supprimer le fichier temporaire
    if let Err(err) = fs::remove_file(temp_file) {
        eprintln!("Failed to delete temporary file: {}", err);
    }

    println!("Video export completed: {}", output_file);
    println!("test2");

    Ok(())
}