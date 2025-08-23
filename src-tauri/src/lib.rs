use std::fs;
use std::path::{Path};
use std::process::Command;
use tokio::process::Command as TokioCommand;
use tokio::io::{AsyncBufReadExt, BufReader};
use regex::Regex;
use tauri::Emitter;

use font_kit::source::SystemSource;

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
    let yt_dlp_path = Path::new("binaries").join("yt-dlp");

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
    let output = Command::new(&yt_dlp_path).args(&args).output();

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

    let ffprobe_path = Path::new("binaries").join("ffprobe");

    let output = Command::new(&ffprobe_path)
        .args(&[
            "-v",
            "quiet",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            file_path,
        ])
        .output();

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
async fn add_audio_to_video(file_name: String, final_file_path: String, audios: Vec<String>, start_time: f64, export_id: String, video_duration: f64, target_width: i32, target_height: i32, app_handle: tauri::AppHandle) -> Result<String, String> {
    // Chemin vers ffmpeg dans le dossier binaries
    let ffmpeg_path = Path::new("binaries").join("ffmpeg.exe");
    
    // Obtenir le dossier de téléchargements de l'utilisateur
    let downloads_dir = dirs::download_dir()
        .ok_or_else(|| "Could not find downloads directory".to_string())?;
    
    let input_video_path = downloads_dir.join(&file_name);
    
    // Vérifier que le fichier vidéo existe
    if !input_video_path.exists() {
        return Err(format!("Video file not found: {}", input_video_path.display()));
    }
    
    // Utiliser le chemin de fichier final fourni par le frontend avec l'extension .mp4
    let output_video_path = Path::new(&final_file_path).with_extension("mp4");
    
    // Créer le dossier parent du fichier de sortie s'il n'existe pas
    if let Some(parent_dir) = output_video_path.parent() {
        if let Err(e) = fs::create_dir_all(parent_dir) {
            return Err(format!("Unable to create output directory: {}", e));
        }
    }
    
    let output_file_name = output_video_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("output.mp4")
        .to_string();
    
    if audios.is_empty() {
        return Err("No audio files provided".to_string());
    }

    // Convertir start_time de millisecondes en secondes
    let start_time_seconds = start_time / 1000.0;
    
    // Obtenir les durées de tous les fichiers audio
    let mut audio_durations = Vec::new();
    for audio_file in &audios {
        match get_duration(audio_file) {
            Ok(duration_ms) => {
                let duration_seconds = duration_ms as f64 / 1000.0; // Convertir ms en secondes
                audio_durations.push(duration_seconds);
            },
            Err(e) => {
                println!("Warning: Could not get duration for {}: {}", audio_file, e);
                audio_durations.push(0.0); // Valeur par défaut si on ne peut pas obtenir la durée
            }
        }
    }
    
    // Calculer quels fichiers audio utiliser et à partir de quel moment
    let mut current_audio_time = 0.0;
    let mut audio_filters = Vec::new();
    let mut input_index = 1; // L'index 0 est la vidéo
    
    for &audio_duration in audio_durations.iter() {
        let audio_end_time = current_audio_time + audio_duration;
        
        // Si le start_time est après la fin de ce fichier audio, on l'ignore complètement
        if start_time_seconds >= audio_end_time {
            current_audio_time = audio_end_time;
            input_index += 1;
            continue;
        }
        
        // Si le start_time est dans ce fichier audio
        if start_time_seconds >= current_audio_time && start_time_seconds < audio_end_time {
            let skip_seconds = start_time_seconds - current_audio_time;
            // Utiliser atrim avec asetpts pour repositionner l'audio au début
            audio_filters.push(format!("[{}:a]atrim=start={},asetpts=PTS-STARTPTS[a{}]", input_index, skip_seconds, audio_filters.len()));
            current_audio_time = audio_end_time;
            input_index += 1;
        } else {
            // Ce fichier audio commence après le start_time, on le prend en entier mais repositionné au début
            audio_filters.push(format!("[{}:a]asetpts=PTS-STARTPTS[a{}]", input_index, audio_filters.len()));
            current_audio_time = audio_end_time;
            input_index += 1;
        }
    }
    
    // Convertir video_duration de millisecondes en secondes
    let video_duration_seconds = video_duration / 1000.0;
    println!("Video duration: {:.2} seconds", video_duration_seconds);
    
    // Construire la commande ffmpeg
    let mut cmd = TokioCommand::new(&ffmpeg_path);
    
    // Supprimer les 0.2 premières secondes de la vidéo car peut contenir l'écran de sélection de share
    cmd.arg("-ss").arg("0.2");
    
    // Ajouter le fichier vidéo d'entrée
    cmd.arg("-i").arg(&input_video_path);
    
    // Ajouter tous les fichiers audio comme inputs
    for audio_file in &audios {
        cmd.arg("-i").arg(audio_file);
    }
    
    // Construire le filtre pour traiter les audios selon le start_time et les appliquer à la vidéo
    if audio_filters.is_empty() {
        return Err("No audio files match the specified start time".to_string());
    } else if audio_filters.len() == 1 {
        // Un seul fichier audio (ou segment) : utiliser le filtre créé + redimensionner la vidéo
        let filter_complex = format!("[0:v]scale={}:{}[v_resized];{}", target_width, target_height, audio_filters[0]);
        
        cmd.arg("-filter_complex").arg(&filter_complex)
           .arg("-map").arg("[v_resized]") // Vidéo redimensionnée
           .arg("-map").arg("[a0]") // Audio filtré
           .arg("-c:v").arg("libx264") // Re-encoder la vidéo en H.264 pour MP4
           .arg("-c:a").arg("aac") // Encoder l'audio en AAC
           .arg("-b:a").arg("128k") // Bitrate audio
           .arg("-preset").arg("fast") // Preset rapide pour l'encodage H.264
           .arg("-crf").arg("18") // Qualité vidéo (plus bas = meilleure qualité)
           .arg("-shortest"); // Arrêter quand le flux le plus court se termine
    } else {
        // Plusieurs fichiers audio : les concaténer après les avoir filtrés + redimensionner la vidéo
        let mut filter_complex = format!("[0:v]scale={}:{}[v_resized];", target_width, target_height);
        filter_complex.push_str(&audio_filters.join(";"));
        
        // Ajouter la concaténation des audios filtrés
        filter_complex.push(';');
        for i in 0..audio_filters.len() {
            filter_complex.push_str(&format!("[a{}]", i));
        }
        filter_complex.push_str(&format!("concat=n={}:v=0:a=1[audio_out]", audio_filters.len()));
        
        cmd.arg("-filter_complex").arg(&filter_complex)
           .arg("-map").arg("[v_resized]") // Vidéo redimensionnée
           .arg("-map").arg("[audio_out]") // Audio concaténé et filtré
           .arg("-c:v").arg("libx264") // Re-encoder la vidéo en H.264 pour MP4
           .arg("-c:a").arg("aac") // Encoder l'audio en AAC
           .arg("-b:a").arg("128k") // Bitrate audio
           .arg("-preset").arg("fast") // Preset rapide pour l'encodage H.264
           .arg("-crf").arg("18") // Qualité vidéo (plus bas = meilleure qualité)
           .arg("-shortest"); // Arrêter quand le flux le plus court se termine
    }
    
    cmd.arg("-y") // Écraser le fichier de sortie s'il existe
       .arg("-progress").arg("pipe:2") // Afficher la progression sur stderr
       .stderr(std::process::Stdio::piped()) // Capturer stderr pour la progression
       .stdout(std::process::Stdio::piped()); // Capturer stdout aussi
    
    // Fichier de sortie
    cmd.arg(&output_video_path);
    
    // Démarrer le processus
    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;
    
    // Lire la progression depuis stderr
    if let Some(stderr) = child.stderr.take() {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        
        // Regex pour extraire le temps actuel de la progression
        let time_regex = Regex::new(r"out_time_ms=(\d+)").unwrap();
        
        while let Some(line) = lines.next_line().await.unwrap_or(None) {
            if let Some(captures) = time_regex.captures(&line) {
                if let Some(time_match) = captures.get(1) {
                    if let Ok(time_us) = time_match.as_str().parse::<u64>() {
                        let current_time = time_us as f64 / 1_000_000.0; // Convertir de microsecondes en secondes
                        
                        if video_duration_seconds > 0.0 {
                            let progress = (current_time / video_duration_seconds * 100.0).min(100.0);
                            println!("Progress: {:.1}% ({:.1}s / {:.1}s)", progress, current_time, video_duration_seconds);
                            
                            // Émettre l'événement vers le frontend
                            let _ = app_handle.emit("export-progress", serde_json::json!({
                                "progress": progress,
                                "current_time": current_time,
                                "total_time": video_duration_seconds
                            }));
                        } else {
                            println!("Processing: {:.1}s elapsed", current_time);
                            
                            // Émettre l'événement vers le frontend sans pourcentage
                            let _ = app_handle.emit("export-progress", serde_json::json!({
                                "progress": null,
                                "current_time": current_time,
                                "total_time": null
                            }));
                        }
                    }
                }
            }
        }
    }
    
    // Attendre que le processus se termine
    let status = child.wait().await.map_err(|e| format!("Failed to wait for ffmpeg: {}", e))?;
    
    if !status.success() {
        let _ = app_handle.emit("export-error", "FFmpeg failed during processing");
        return Err("FFmpeg failed during processing".to_string());
    }
    
    println!("✓ Video with audio saved as: {}", output_file_name);
    
    // Supprimer la vidéo originale (sans audio)
    if input_video_path.exists() {
        match std::fs::remove_file(&input_video_path) {
            Ok(_) => println!("✓ Original video file deleted: {}", file_name),
            Err(e) => println!("⚠ Failed to delete original video file: {}", e),
        }
    }
    
    // Émettre l'événement de fin d'export
    let _ = app_handle.emit("export-complete", serde_json::json!({
        "filename": output_file_name,
        "exportId": export_id
    }));
    
    Ok(format!("Video with audio saved as: {}", output_file_name))
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
        let output = Command::new("explorer")
            .args(&["/select,", &file_path])
            .output();

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
            add_audio_to_video,
            open_explorer_with_file_selected
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
