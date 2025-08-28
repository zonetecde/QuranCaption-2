use std::fs;
use std::path::{Path};
use std::process::Command;
use tokio::process::Command as TokioCommand;
use tokio::io::{AsyncBufReadExt, BufReader};
use regex::Regex;
use tauri::Emitter;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
mod exporter;

use font_kit::source::SystemSource;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// Stockage global des process IDs d'export en cours
lazy_static::lazy_static! {
    static ref EXPORT_PROCESS_IDS: Arc<Mutex<HashMap<String, u32>>> = Arc::new(Mutex::new(HashMap::new()));
}

// Fonction utilitaire pour configurer les commandes et cacher les fenêtres CMD sur Windows
fn configure_command_no_window(cmd: &mut Command) {
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
}

fn configure_tokio_command_no_window(cmd: &mut TokioCommand) {
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
}

#[tauri::command]
async fn download_from_youtube(
    url: String,
    _type: String,
    download_path: String,
) -> Result<String, String> {
    // Créer le dossier de téléchargement s'il n'existe pas
    if let Err(e) = fs::create_dir_all(&download_path) {
        return Err(format!("Unable to create directory: {}", e));
    }

    // Chemin vers yt-dlp dans le dossier binaries (relatif au working directory)
    let yt_dlp_path = if cfg!(target_os = "windows") {
        Path::new("binaries").join("yt-dlp.exe")
    } else {
        Path::new("binaries").join("yt-dlp")
    };

    // Vérifier que le binaire existe
    if !yt_dlp_path.exists() {
        return Err(format!("yt-dlp binary not found at: {}", yt_dlp_path.display()));
    }

    // Configuration selon le type (audio ou vidéo)
    let mut args = vec!["--force-ipv4"];

    // Pattern de sortie avec le titre de la vidéo et le nom de la chaîne
    let output_pattern = format!("{}/%(title)s (%(uploader)s).%(ext)s", download_path);

    match _type.as_str() {
        "audio" => {
            // Pour l'audio : qualité maximale, format MP3, bitrate constant
            args.extend_from_slice(&[
                "--extract-audio",
                "--audio-format",
                "mp3",
                "--audio-quality",
                "0", // Qualité maximale
                "--postprocessor-args",
                "ffmpeg:-b:a 320k -ar 44100", // Bitrate constant 320k
                "-o",
                &output_pattern,
            ]);
        }
        "video" => {
            // Pour la vidéo : 1080p ou moins, format MP4, bitrate constant
            args.extend_from_slice(&[
                "--format",
                "best[height<=1080][ext=mp4]/best[ext=mp4]/best",
                "--merge-output-format",
                "mp4",
                "--postprocessor-args",
                "ffmpeg:-b:v 2000k -maxrate 2000k -bufsize 4000k -b:a 128k",
                "-o",
                &output_pattern,
            ]);
        }
        _ => {
            return Err("Invalid type: must be 'audio' or 'video'".to_string());
        }
    }

    // Ajouter l'URL à la fin
    args.push(&url);

    // Exécuter yt-dlp
    let mut cmd = Command::new(&yt_dlp_path);
    cmd.args(&args);
    configure_command_no_window(&mut cmd);
    let output = cmd.output();

    match output {
        Ok(result) => {
            if result.status.success() {
                let output_str = String::from_utf8_lossy(&result.stdout);
                println!("yt-dlp output: {}", output_str);

                // Chercher le fichier téléchargé dans le dossier
                let extension = if _type == "audio" { "mp3" } else { "mp4" };

                // Lire le dossier pour trouver le fichier téléchargé
                match fs::read_dir(&download_path) {
                    Ok(entries) => {
                        for entry in entries {
                            if let Ok(entry) = entry {
                                let path = entry.path();
                                if let Some(ext) = path.extension() {
                                    if ext == extension {
                                        if let Some(_filename) = path.file_name() {
                                            let file_path = path.to_string_lossy().to_string();

                                            return Ok(file_path);
                                        }
                                    }
                                }
                            }
                        }
                        Err("Downloaded file not found".to_string())
                    }
                    Err(e) => Err(format!("Error reading directory: {}", e)),
                }
            } else {
                let stderr = String::from_utf8_lossy(&result.stderr);
                let stdout = String::from_utf8_lossy(&result.stdout);
                Err(format!("yt-dlp error: {}\n{}", stderr, stdout))
            }
        }
        Err(e) => Err(format!("Unable to execute yt-dlp: {}", e)),
    }
}

// Fonction pour obtenir la durée précise du fichier téléchargé avec ffprobe
#[tauri::command]
fn get_duration(file_path: &str) -> Result<i64, String> {
    // If the file does not exist, return -1
    if !std::path::Path::new(file_path).exists() {
        return Ok(-1);
    }

    let ffprobe_path = if cfg!(target_os = "windows") {
        Path::new("binaries").join("ffprobe.exe")
    } else {
        Path::new("binaries").join("ffprobe")
    };

    // Vérifier que le binaire existe
    if !ffprobe_path.exists() {
        return Ok(-1); // Si ffprobe n'existe pas, retourner -1
    }

    let mut cmd = Command::new(&ffprobe_path);
    cmd.args(&[
        "-v",
        "quiet",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        file_path,
    ]);
    configure_command_no_window(&mut cmd);
    let output = cmd.output();

    match output {
        Ok(result) => {
            if result.status.success() {
                let output_str = String::from_utf8_lossy(&result.stdout);
                let duration_line = output_str.trim();

                if let Ok(duration_seconds) = duration_line.parse::<f64>() {
                    // Convertir en millisecondes avec précision
                    Ok((duration_seconds * 1000.0).round() as i64)
                } else {
                    Err("Unable to parse duration from ffprobe output".to_string())
                }
            } else {
                let stderr = String::from_utf8_lossy(&result.stderr);
                Err(format!("ffprobe error: {}", stderr))
            }
        }
        Err(e) => Err(format!("Unable to execute ffprobe: {}", e)),
    }
}

#[tauri::command]
fn get_new_file_path(start_time: u64, asset_name: &str) -> Result<String, String> {
    // get download directory folder (on windows, macos and linux)
    let download_path = dirs::download_dir()
        .ok_or_else(|| "Unable to determine download directory".to_string())?
        .to_string_lossy()
        .to_string();

    // Search for a file whose creation date is > start_time
    let entries = fs::read_dir(&download_path)
        .map_err(|e| format!("Unable to read download directory: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(created) = metadata.created() {
                    let created_time = created
                        .duration_since(std::time::UNIX_EPOCH)
                        .map_err(|_| "Time went backwards")?
                        .as_millis() as u64;

                    // If the creation date is greater than start_time, check the file name
                    if created_time > start_time {
                        let file_path = entry.path();
                        if let Some(file_name) = file_path.file_name() {
                            let file_name_str = file_name.to_string_lossy();
                            let asset_name_trimmed = asset_name.trim();

                            // Check if the file name contains the asset name
                            if file_name_str.contains(asset_name_trimmed) {
                                return Ok(file_path.to_string_lossy().to_string());
                            } else {
                                return Ok(file_path.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
    }
    Err("Downloaded file not found".to_string())
}

#[tauri::command]
fn move_file(source: String, destination: String) -> Result<(), String> {
    // If destination exists, remove it first to force the move
    if std::path::Path::new(&destination).exists() {
        std::fs::remove_file(&destination).map_err(|e| e.to_string())?;
    }
    std::fs::rename(source, destination).map_err(|e| e.to_string())
}
#[tauri::command]
fn get_system_fonts() -> Result<Vec<String>, String> {
    let source = SystemSource::new();
    let fonts = source.all_fonts().map_err(|e| e.to_string())?;
    let mut font_names = Vec::new();
    let mut seen_names = std::collections::HashSet::new();

    for font in fonts {
        // Load the font to get its properties
        let handle = font.load().map_err(|e| e.to_string())?;
        let family = handle.family_name();
        
        // Only add the font name if we haven't seen it before
        if seen_names.insert(family.clone()) {
            font_names.push(family);
        }
    }

    // Sort the font names alphabetically for better usability
    font_names.sort();
    Ok(font_names)
}

#[tauri::command]
async fn cancel_export(export_id: String) -> Result<String, String> {
    println!("[cancel_export] Tentative d'annulation de l'export {}", export_id);
    
    let mut process_ids = EXPORT_PROCESS_IDS.lock().unwrap();
    
    if let Some(pid) = process_ids.remove(&export_id) {
        drop(process_ids); // Libérer le lock avant l'opération potentiellement bloquante
        
        println!("[cancel_export] Processus trouvé avec PID {} pour l'export {}, tentative de terminaison", pid, export_id);
        
        // Tuer le processus en utilisant le PID
        #[cfg(target_os = "windows")]
        {
            let mut cmd = Command::new("taskkill");
            cmd.args(&["/F", "/PID", &pid.to_string()]);
            configure_command_no_window(&mut cmd);
            let output = cmd.output();
            
            match output {
                Ok(result) => {
                    if result.status.success() {
                        println!("[cancel_export] ✓ Processus ffmpeg tué avec succès pour l'export {}", export_id);
                        Ok(format!("Export {} canceled successfully", export_id))
                    } else {
                        let stderr = String::from_utf8_lossy(&result.stderr);
                        println!("[cancel_export] ✗ Erreur taskkill: {}", stderr);
                        Err(format!("Failed to kill process: {}", stderr))
                    }
                }
                Err(e) => {
                    println!("[cancel_export] ✗ Erreur lors de l'exécution de taskkill: {}", e);
                    Err(format!("Failed to execute taskkill: {}", e))
                }
            }
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            let mut cmd = Command::new("kill");
            cmd.args(&["-TERM", &pid.to_string()]);
            configure_command_no_window(&mut cmd);
            let output = cmd.output();
            
            match output {
                Ok(result) => {
                    if result.status.success() {
                        println!("[cancel_export] ✓ Processus ffmpeg tué avec succès pour l'export {}", export_id);
                        Ok(format!("Export {} canceled successfully", export_id))
                    } else {
                        let stderr = String::from_utf8_lossy(&result.stderr);
                        println!("[cancel_export] ✗ Erreur kill: {}", stderr);
                        Err(format!("Failed to kill process: {}", stderr))
                    }
                }
                Err(e) => {
                    println!("[cancel_export] ✗ Erreur lors de l'exécution de kill: {}", e);
                    Err(format!("Failed to execute kill: {}", e))
                }
            }
        }
    } else {
        println!("[cancel_export] ✗ Aucun processus trouvé pour l'export {}", export_id);
        Err(format!("No active export found with ID: {}", export_id))
    }
}

#[tauri::command]
fn open_explorer_with_file_selected(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    
    // Vérifier que le fichier existe
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    #[cfg(target_os = "windows")]
    {
        // Sur Windows, utiliser explorer.exe avec /select pour sélectionner le fichier
        // Note: explorer.exe peut retourner un code de sortie non-zéro même en cas de succès
        let mut cmd = Command::new("explorer");
        cmd.args(&["/select,", &file_path]);
        configure_command_no_window(&mut cmd);
        let output = cmd.output();

        match output {
            Ok(_) => {
                // Si la commande a pu être exécutée, on considère que c'est un succès
                // car explorer.exe peut retourner des codes de sortie non-zéro même quand ça marche
                Ok(())
            }
            Err(e) => Err(format!("Failed to execute explorer command: {}", e))
        }
    }

    #[cfg(target_os = "macos")]
    {
        // Sur macOS, utiliser 'open' avec -R pour révéler le fichier dans Finder
        let output = Command::new("open")
            .args(&["-R", &file_path])
            .output();

        match output {
            Ok(result) => {
                if result.status.success() {
                    Ok(())
                } else {
                    // Fallback: ouvrir juste le dossier parent
                    if let Some(parent) = path.parent() {
                        let fallback_output = Command::new("open")
                            .arg(parent)
                            .output();
                        
                        match fallback_output {
                            Ok(fallback_result) => {
                                if fallback_result.status.success() {
                                    Ok(())
                                } else {
                                    Err("Failed to open Finder".to_string())
                                }
                            }
                            Err(e) => Err(format!("Failed to execute open command: {}", e))
                        }
                    } else {
                        Err("Failed to open Finder and no parent directory found".to_string())
                    }
                }
            }
            Err(e) => Err(format!("Failed to execute open command: {}", e))
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Sur Linux, essayer plusieurs gestionnaires de fichiers
        let file_managers = ["nautilus", "dolphin", "thunar", "pcmanfm", "caja"];
        let parent_dir = path.parent().ok_or("No parent directory found")?;
        
        for manager in &file_managers {
            let output = Command::new(manager)
                .arg(parent_dir)
                .output();
                
            match output {
                Ok(result) => {
                    if result.status.success() {
                        return Ok(());
                    }
                }
                Err(_) => continue, // Essayer le gestionnaire suivant
            }
        }
        
        // Fallback: utiliser xdg-open pour ouvrir le dossier parent
        let output = Command::new("xdg-open")
            .arg(parent_dir)
            .output();

        match output {
            Ok(result) => {
                if result.status.success() {
                    Ok(())
                } else {
                    Err("Failed to open file manager".to_string())
                }
            }
            Err(e) => Err(format!("Failed to execute xdg-open command: {}", e))
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        // Pour les autres OS, juste retourner une erreur
        Err("Unsupported operating system".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())        .invoke_handler(tauri::generate_handler![
            download_from_youtube,
            get_duration,
            get_new_file_path,
            move_file,
            get_system_fonts,
            open_explorer_with_file_selected,
            cancel_export,
            exporter::export_video
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
