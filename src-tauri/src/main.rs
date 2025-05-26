// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::process::Child;
use std::{ format, vec };
use font_kit::{error::SelectionError, source::SystemSource};
use tauri::Manager; // Ajouté pour permettre l'émission d'événements
use std::collections::HashMap;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use std::io::{BufRead, BufReader};
use regex::Regex;

#[cfg(target_os = "windows")] // Import uniquement pour Windows
use std::os::windows::process::CommandExt;

// Stockage global des processus en cours
static EXPORT_PROCESSES: Lazy<Mutex<HashMap<String, Child>>> = Lazy::new(|| {
    Mutex::new(HashMap::new())
});

fn main() {
  tauri::Builder::default()
    .invoke_handler(                                                                                                    tauri::generate_handler![get_video_duration, all_families, get_file_content, do_file_exist, download_youtube_video, path_to_executable, create_video, cancel_export, is_export_running, close, open_file_dir])
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
    export_id: String,
    folder_path: String,
    audio_path: String,
    transition_ms: i32,
    start_time: i32,
    end_time: i32,
    output_path: String,
    top_ratio: f32,
    bottom_ratio: f32,
    dynamic_top: bool,
    background_file: String,
    background_x_translation: f32,
    background_y_translation: f32,
    background_scale: f32,
    audio_fade_start: i32,
    audio_fade_end: i32,
    fps: i32,
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
                background_file.clone(),
                background_x_translation.to_string(),
                background_y_translation.to_string(),
                background_scale.to_string(),
                audio_fade_start.to_string(),
                audio_fade_end.to_string(),
            ];

            // ajout parametre optionnel: --fps
            let cmd_args = if fps > 0 {
                let mut args = cmd_args.clone();
                args.push("--fps".to_string());
                args.push(fps.to_string());
                args
            } else {
                cmd_args
            };


            // Execute the command in the background and capture output
            let mut command = std::process::Command::new(video_creator_path);
            command.args(&cmd_args);
            
            // Configure to capture stdout
            command.stdout(std::process::Stdio::piped());

            #[cfg(target_os = "windows")]
            {
                command.creation_flags(0x08000000); // CREATE_NO_WINDOW
            }            // Start the process
            let mut child = command
                .spawn()
                .map_err(|e| format!("Error while starting process: {}", e))?;
            
            // Récupère le stdout avant d'enregistrer le processus
            let stdout = child.stdout.take();
            
            // Enregistre le processus dans le gestionnaire
            {
                let mut processes = EXPORT_PROCESSES.lock().unwrap();
                processes.insert(export_id.clone(), child);
            }
            
            // Obtient un nouveau Child pour continuer le traitement
            let process_id = {
                let processes = EXPORT_PROCESSES.lock().unwrap();
                processes.get(&export_id).map(|child| child.id())
            };
            
            println!("Started export process {} with PID: {:?}", export_id, process_id);
              // Get stdout handle
            if let Some(stdout) = stdout {
                // Create a buffered reader
                let reader = BufReader::new(stdout);
                
                // Regex to extract percentage
                let re = Regex::new(r"percentage:\s*(\d+)%").unwrap();
                
                // Read line by line
                for line in reader.lines() {
                    if let Ok(line) = line {
                        println!("Output: {}", line);
                        
                        // Try to find percentage and status in the line
                        if let Some(caps) = re.captures(&line) {
                            if let Some(percentage_match) = caps.get(1) {
                                if let Ok(percentage) = percentage_match.as_str().parse::<i32>() {
                                    // Extract status from the line
                                    let status = line.split('|')
                                        .nth(1)
                                        .map(|s| s.trim().replace("status: ", ""))
                                        .unwrap_or_else(|| "Unknown status".to_string());
                                    
                                    // Emit event with current progress and status
                                    let payload = serde_json::json!({
                                        "exportId": export_id,
                                        "progress": percentage,
                                        "status": status
                                    });
                                    let _ = app_handle.emit_all("updateExportDetailsById", payload);
                                }
                            }
                        }
                    }
                }
            }            // Wait for process to complete
            let status = {
                // Récupère le processus pour attendre sa fin
                let mut processes = EXPORT_PROCESSES.lock().unwrap();
                if let Some(mut child) = processes.remove(&export_id) {
                    // Attend la fin du processus
                    match child.try_wait() {
                        Ok(Some(status)) => {
                            // Le processus s'est déjà terminé
                            status
                        },
                        Ok(None) => {
                            // Le processus est toujours en cours, attendons sa fin
                            match child.wait() {
                                Ok(status) => status,
                                Err(e) => {
                                    println!("Erreur en attendant le processus: {}", e);
                                    // Si on ne peut pas attendre le processus, vérifions s'il a été annulé
                                    let payload = serde_json::json!({
                                        "exportId": export_id,
                                        "progress": 0,
                                        "status": "Error"
                                    });
                                    let _ = app_handle.emit_all("updateExportDetailsById", payload);
                                    return Err(format!("Erreur en attendant le processus: {}", e));
                                }
                            }
                        },
                        Err(e) => {
                            println!("Erreur en vérifiant l'état du processus: {}", e);
                            // En cas d'erreur, on suppose que le processus a échoué
                            let payload = serde_json::json!({
                                "exportId": export_id,
                                "progress": 0,
                                "status": "Error"
                            });
                            let _ = app_handle.emit_all("updateExportDetailsById", payload);
                            return Err(format!("Erreur en vérifiant l'état du processus: {}", e));
                        }
                    }
                } else {
                    // Si le processus n'existe plus dans la HashMap, c'est qu'il a probablement été annulé
                    println!("Le processus d'export {} n'existe plus dans la HashMap, probablement annulé", export_id);
                    return Ok(format!("Processus d'export {} interrompu", export_id));
                }
            };            // Vérifie si la vidéo a été créée avec succès en regardant si le fichier existe
            if std::path::Path::new(&output_path).exists() {
                // La vidéo a été créée avec succès
                let payload = serde_json::json!({
                    "exportId": export_id,
                    "progress": 100,
                    "status": "Exported"
                });
                let _ = app_handle.emit_all("updateExportDetailsById", payload);
                Ok("Processus de création vidéo terminé avec succès.".to_string())
            } else {
                // La vidéo n'a pas été créée - vérifier le code de sortie pour déterminer la cause
                let error_code = status.code().unwrap_or(-1);
                
                // Sur Windows, un processus tué violemment retourne souvent 1
                // Mais il faut distinguer entre annulation et échec
                if error_code == 1 {
                    // Vérifier si c'est vraiment une annulation en cherchant des processus video_creator
                    let payload = serde_json::json!({
                        "exportId": export_id,
                        "progress": 0,
                        "status": "Cancelled"
                    });
                    let _ = app_handle.emit_all("updateExportDetailsById", payload);
                    Ok("Processus de création vidéo annulé.".to_string())
                } else {
                    // Échec pour une autre raison
                    println!("Processus d'export {} échoué avec le code {}", export_id, error_code);
                    let payload = serde_json::json!({
                        "exportId": export_id,
                        "progress": 0,
                        "status": "Error"
                    });
                    let _ = app_handle.emit_all("updateExportDetailsById", payload);
                    Err(format!("Processus de création vidéo échoué avec le code {}.", error_code))
                }
            }
        },
        None => {
            // Handle the case where the path could not be resolved
            Err("Failed to resolve video_creator path".to_string())
        }
    }
}

#[tauri::command]
fn close() {
    // Close the application
    std::process::exit(0);
}

#[tauri::command]
fn open_file_dir(path: String) {
    // Vérifie si le chemin existe
    let file_path = std::path::Path::new(&path);
    if !file_path.exists() {
        eprintln!("File or directory does not exist: {}", path);
        return;
    }

    // Sur Windows, utilise /select pour ouvrir l'explorateur avec le fichier sélectionné
    #[cfg(target_os = "windows")]
    {
        if let Err(e) = std::process::Command::new("explorer")
            .arg("/select,")
            .arg(file_path)
            .spawn() {
            eprintln!("Unable to open the file manager: {}", e);
        }
    }

    // Sur macOS
    #[cfg(target_os = "macos")]
    {
        if file_path.is_file() {
            // Pour sélectionner un fichier spécifique, on utilise osascript
            let parent = file_path.parent().unwrap_or(file_path);
            let filename = file_path.file_name().unwrap_or_default().to_string_lossy();
            
            let script = format!(
                "tell application \"Finder\" to reveal POSIX file \"{}\" activate",
                file_path.to_string_lossy()
            );
            
            if let Err(e) = std::process::Command::new("osascript")
                .arg("-e")
                .arg(script)
                .spawn() {
                eprintln!("Unable to open the file manager: {}", e);
            }
        } else {
            // Si c'est un dossier, on l'ouvre simplement
            if let Err(e) = std::process::Command::new("open")
                .arg(file_path)
                .spawn() {
                eprintln!("Unable to open the folder: {}", e);
            }
        }
    }

    // Sur Linux
    #[cfg(target_os = "linux")]
    {
        // Sur Linux, on ne peut pas facilement sélectionner un fichier spécifique
        // On ouvre donc simplement le dossier parent
        let dir_path = if file_path.is_file() {
            file_path.parent().unwrap_or(file_path)
        } else {
            file_path
        };
        
        if let Err(e) = std::process::Command::new("xdg-open")
            .arg(dir_path)
            .spawn() {
            eprintln!("Unable to open the file manager: {}", e);
        }
    }
}

#[tauri::command]
async fn cancel_export(export_id: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    // Essaie de récupérer et supprimer le processus associé à cet export_id
    let mut processes = EXPORT_PROCESSES.lock().unwrap();
    if let Some(mut child) = processes.remove(&export_id) {
        // Récupère l'ID du processus avant de tenter de le tuer
        let process_id = child.id();
        println!("Attempting to stop export process {}, PID: {}", export_id, process_id);
        
        // Une approche plus radicale pour Windows
        #[cfg(target_os = "windows")]
        {
            // Utilise taskkill /F /T pour tuer le processus et tous ses enfants
            let _ = std::process::Command::new("taskkill")
                .args(&["/F", "/T", "/PID", &process_id.to_string()])
                .output();
        }
        
        // Tente également de tuer le processus avec l'API standard de Rust
        let kill_result = child.kill();
        
        match kill_result {
            Ok(_) => {
                println!("Process {} stopped successfully", process_id);
            },
            Err(e) => {
                println!("Error while stopping process {} with kill(): {}", process_id, e);
                // Même en cas d'erreur, on ne réinsère pas le processus car on a utilisé taskkill
            }
        }
        
        // Émet un événement pour informer le frontend que l'export a été annulé
        let payload = serde_json::json!({
            "exportId": export_id,
            "progress": 0,
            "status": "Cancelled"
        });
        let _ = app_handle.emit_all("updateExportDetailsById", payload);

        Ok(format!("Export {} cancelled successfully", export_id))
    } else {
        // Si on ne trouve pas le processus dans notre HashMap, on tente de trouver tous les processus video_creator.exe
        #[cfg(target_os = "windows")]
        {
            println!("Recherche de video_creator.exe pour l'export {}", export_id);
            let _ = std::process::Command::new("taskkill")
                .args(&["/F", "/IM", "video_creator.exe"])
                .output();
        }
        
        // Émet quand même un événement d'annulation
        let payload = serde_json::json!({
            "exportId": export_id,
            "progress": 0,
            "status": "Cancelled"
        });
        let _ = app_handle.emit_all("updateExportDetailsById", payload);
        
        Err(format!("No process found for export {}. Attempting to forcibly stop all video_creator.exe processes.", export_id))
    }
}

#[tauri::command]
async fn is_export_running(export_id: String) -> bool {
    let processes = EXPORT_PROCESSES.lock().unwrap();
    processes.contains_key(&export_id)
}