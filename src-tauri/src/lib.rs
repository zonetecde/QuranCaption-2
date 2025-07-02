use std::fs;
use std::path::Path;
use std::process::Command;

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
fn get_duration(file_path: &str) -> Result<u64, String> {
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
                    Ok((duration_seconds * 1000.0).round() as u64)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            download_from_youtube,
            get_duration
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
