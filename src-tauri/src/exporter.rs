use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use std::io::Write;
use serde::{Deserialize, Serialize};
use tauri::async_runtime;
use tokio::task;

// Expose la dernière durée d'export terminée (en secondes)
static LAST_EXPORT_TIME_S: Mutex<Option<f64>> = Mutex::new(None);

fn resolve_ffmpeg_binary() -> Option<String> {
    // Honorer un override externe si déjà fourni
    if let Ok(exe) = env::var("IMAGEIO_FFMPEG_EXE") {
        if Path::new(&exe).exists() {
            return Some(exe);
        }
    }
    
    // Binaire embarqué (Windows)
    let current_exe = env::current_exe().ok()?;
    let local_bin = current_exe
        .parent()?
        .parent()?
        .join("binaries")
        .join(if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" });
    
    if local_bin.exists() {
        let path_str = local_bin.to_string_lossy().to_string();
        env::set_var("IMAGEIO_FFMPEG_EXE", &path_str);
        return Some(path_str);
    }
    
    None
}

fn resolve_ffprobe_binary() -> String {
    let current_exe = env::current_exe().ok();
    if let Some(exe) = current_exe {
        let local_bin = exe
            .parent()
            .and_then(|p| p.parent())
            .map(|p| p.join("binaries").join(if cfg!(windows) { "ffprobe.exe" } else { "ffprobe" }));
        
        if let Some(bin) = local_bin {
            if bin.exists() {
                return bin.to_string_lossy().to_string();
            }
        }
    }
    
    "ffprobe".to_string()
}

fn probe_hw_encoders(ffmpeg_path: Option<&str>) -> Vec<String> {
    let exe = ffmpeg_path.unwrap_or("ffmpeg");
    
    let output = match Command::new(exe)
        .args(&["-hide_banner", "-encoders"])
        .output()
    {
        Ok(output) => output,
        Err(_) => return Vec::new(),
    };
    
    let txt = String::from_utf8_lossy(&output.stdout).to_lowercase();
    let mut found = Vec::new();
    
    if txt.contains("h264_nvenc") {
        found.push("h264_nvenc".to_string());
    }
    if txt.contains("h264_qsv") {
        found.push("h264_qsv".to_string());
    }
    if txt.contains("h264_amf") {
        found.push("h264_amf".to_string());
    }
    
    found
}

fn choose_best_codec(prefer_hw: bool) -> (String, Vec<String>, HashMap<String, Option<String>>) {
    let ffmpeg_exe = resolve_ffmpeg_binary();
    let hw = if prefer_hw {
        probe_hw_encoders(ffmpeg_exe.as_deref())
    } else {
        Vec::new()
    };
    
    if !hw.is_empty() {
        let codec = hw[0].clone();
        let params = vec!["-pix_fmt".to_string(), "yuv420p".to_string()];
        let mut extra = HashMap::new();
        extra.insert("preset".to_string(), None);
        return (codec, params, extra);
    }
    
    // Fallback libx264
    let codec = "libx264".to_string();
    let params = vec![
        "-pix_fmt".to_string(), "yuv420p".to_string(),
        "-crf".to_string(), "22".to_string(),
        "-tune".to_string(), "zerolatency".to_string(),
        "-bf".to_string(), "0".to_string(),
    ];
    let mut extra = HashMap::new();
    extra.insert("preset".to_string(), Some("ultrafast".to_string()));
    
    (codec, params, extra)
}

fn ffmpeg_preprocess_video(src: &str, dst: &str, w: i32, h: i32, fps: i32, prefer_hw: bool) -> Result<(), Box<dyn std::error::Error + Send + Sync + 'static>> {
    let (codec, params, extra) = choose_best_codec(prefer_hw);
    let exe = resolve_ffmpeg_binary().unwrap_or_else(|| "ffmpeg".to_string());
    
    let vf = format!(
        "scale=w={}:h={}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2:color=black,fps={}",
        w, h, w, h, fps
    );
    
    let mut cmd = Command::new(&exe);
    cmd.args(&[
        "-y",
        "-hide_banner",
        "-loglevel", "error",
        "-i", src,
        "-an",
        "-vf", &vf,
        "-pix_fmt", "yuv420p",
        "-c:v", &codec,
    ]);
    
    if let Some(Some(preset)) = extra.get("preset") {
        cmd.args(&["-preset", preset]);
    }
    
    for param in params {
        cmd.arg(param);
    }
    
    cmd.arg(dst);
    
    println!("[preproc] ffmpeg scale+pad -> {}", Path::new(dst).file_name().unwrap_or_default().to_string_lossy());
    
    let status = cmd.status()?;
    if !status.success() {
        return Err(Box::new(std::io::Error::new(std::io::ErrorKind::Other, "FFmpeg preprocessing failed")));
    }
    
    Ok(())
}

fn preprocess_background_videos(video_paths: &[String], w: i32, h: i32, fps: i32, prefer_hw: bool) -> Vec<String> {
    let mut out_paths = Vec::new();
    let cache_dir = std::env::temp_dir().join("qurancaption-preproc");
    fs::create_dir_all(&cache_dir).ok();
    
    for p in video_paths {
        let hash_input = format!("{}-{}x{}-{}", p, w, h, fps);
        let stem_hash = format!("{:x}", md5::compute(hash_input.as_bytes()));
        let stem_hash = &stem_hash[..10.min(stem_hash.len())];
        let dst = cache_dir.join(format!("bg-{}-{}x{}-{}.mp4", stem_hash, w, h, fps));
        
        if !dst.exists() {
            match ffmpeg_preprocess_video(p, &dst.to_string_lossy(), w, h, fps, prefer_hw) {
                Ok(_) => {},
                Err(e) => {
                    println!("[preproc][ERREUR] {:?}", e);
                    out_paths.push(p.clone());
                    continue;
                }
            }
        }
        
        out_paths.push(dst.to_string_lossy().to_string());
    }
    
    out_paths
}

fn ffprobe_duration_sec(path: &str) -> f64 {
    let exe = resolve_ffprobe_binary();
    
    let output = match Command::new(&exe)
        .args(&[
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=nokey=1:noprint_wrappers=1",
            path,
        ])
        .output()
    {
        Ok(output) => output,
        Err(_) => return 0.0,
    };
    
    let txt = String::from_utf8_lossy(&output.stdout).trim().to_string();
    txt.parse::<f64>().unwrap_or(0.0)
}

#[allow(clippy::too_many_arguments)]
fn build_and_run_ffmpeg_filter_complex(
    out_path: &str,
    image_paths: &[String],
    timestamps_ms: &[i32],
    target_size: (i32, i32),
    fps: i32,
    fade_duration_ms: i32,
    start_time_ms: i32,
    audio_paths: &[String],
    bg_videos: &[String],
    prefer_hw: bool,
    imgs_cwd: Option<&str>,
    duration_ms: Option<i32>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync + 'static>> {
    let (w, h) = target_size;
    let fade_s = (fade_duration_ms as f64 / 1000.0).max(0.0);
    let start_s = (start_time_ms as f64 / 1000.0).max(0.0);
    
    let n = image_paths.len();
    if n == 0 {
        return Err(Box::new(std::io::Error::new(std::io::ErrorKind::InvalidInput, "Aucune image fournie")));
    }
    if n != timestamps_ms.len() {
        return Err(Box::new(std::io::Error::new(std::io::ErrorKind::InvalidInput, "Le nombre d'images ne correspond pas au nombre de timestamps")));
    }
    
    let tail_ms = fade_duration_ms.max(1000);
    let mut durations_s = Vec::new();
    
    for i in 0..n {
        if i < n - 1 {
            durations_s.push(((timestamps_ms[i + 1] - timestamps_ms[i]) as f64 / 1000.0).max(0.001));
        } else {
            durations_s.push((tail_ms as f64 / 1000.0).max(0.001));
        }
    }
    
    let total_by_ts = (timestamps_ms[n - 1] + tail_ms) as f64 / 1000.0;
    let duration_s = if let Some(dur_ms) = duration_ms {
        dur_ms as f64 / 1000.0
    } else {
        total_by_ts
    };
    
    let mut starts_s = Vec::new();
    let mut acc = 0.0;
    for &d in &durations_s {
        starts_s.push(acc);
        acc += d;
    }
    
    let (vcodec, vparams, vextra) = choose_best_codec(prefer_hw);
    
    let mut pre_videos = Vec::new();
    if !bg_videos.is_empty() {
        pre_videos = preprocess_background_videos(bg_videos, w, h, fps, prefer_hw);
    }
    
    let mut total_bg_s = 0.0;
    for p in &pre_videos {
        total_bg_s += ffprobe_duration_sec(p);
    }
    
    let mut total_audio_s = 0.0;
    for p in audio_paths {
        total_audio_s += ffprobe_duration_sec(p);
    }
    let have_audio = !audio_paths.is_empty() && start_s < total_audio_s - 1e-6;
    
    // Préparer le fichier concat
    let base_dir = if let Some(cwd) = imgs_cwd {
        PathBuf::from(cwd)
    } else {
        std::env::temp_dir()
    };
    fs::create_dir_all(&base_dir).ok();
    
    let concat_content = image_paths.join("|");
    let concat_hash = format!("{:x}", md5::compute(concat_content.as_bytes()));
    let concat_path = base_dir.join(format!("images-{}.ffconcat", &concat_hash[..8]));
    
    let mut concat_file = fs::File::create(&concat_path)?;
    writeln!(concat_file, "ffconcat version 1.0")?;
    for (i, p) in image_paths.iter().enumerate() {
        writeln!(concat_file, "file '{}'", p)?;
        writeln!(concat_file, "duration {:.6}", durations_s[i])?;
    }
    writeln!(concat_file, "file '{}'", image_paths[n - 1])?;
    
    println!("[concat] Fichier ffconcat -> {:?}", concat_path);
    
    let mut cmd = Vec::new();
    let ffmpeg_exe = resolve_ffmpeg_binary().unwrap_or_else(|| "ffmpeg".to_string());
    cmd.extend_from_slice(&[
        ffmpeg_exe.clone(),
        "-y".to_string(),
        "-hide_banner".to_string(),
        "-loglevel".to_string(), "info".to_string(),
        "-stats".to_string(),
    ]);
    
    let mut current_idx = 0;
    
    // Entrée unique: concat demuxer
    let concat_name = if imgs_cwd.is_some() {
        concat_path.file_name().unwrap().to_string_lossy().to_string()
    } else {
        concat_path.to_string_lossy().to_string()
    };
    
    cmd.extend_from_slice(&[
        "-safe".to_string(), "0".to_string(),
        "-f".to_string(), "concat".to_string(),
        "-i".to_string(), concat_name,
    ]);
    current_idx = 1;
    
    // Entrées vidéos de fond
    let bg_start_idx = current_idx;
    for p in &pre_videos {
        cmd.extend_from_slice(&["-i".to_string(), p.clone()]);
        current_idx += 1;
    }
    
    // Entrées audio
    let audio_start_idx = current_idx;
    if have_audio {
        for p in audio_paths {
            cmd.extend_from_slice(&["-i".to_string(), p.clone()]);
            current_idx += 1;
        }
    }
    
    let mut filter_lines = Vec::new();
    
    // Base: préparer le flux vidéo unique [0:v]
    let mut split_outputs = String::new();
    for i in 0..n {
        split_outputs.push_str(&format!("[b{}]", i));
    }
    
    filter_lines.push(format!(
        "[0:v]format=rgba,scale=w={}:h={}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2:color=black@0,fps={},setsar=1,format=yuva444p,split={}{}",
        w, h, w, h, fps, n, split_outputs
    ));
    
    // Pour chaque segment, extraire la fenêtre temporelle et séparer couleur/alpha
    for i in 0..n {
        let s = starts_s[i];
        let e = s + durations_s[i];
        filter_lines.push(format!(
            "[b{}]trim=start={:.6}:end={:.6},setpts=PTS-STARTPTS,split=2[s{}witha][s{}foralpha]",
            i, s, e, i, i
        ));
        filter_lines.push(format!("[s{}foralpha]extractplanes=a[s{}a]", i, i));
        filter_lines.push(format!("[s{}witha]format=yuv444p[s{}c]", i, i));
    }
    
    // Chaîne xfade pour couleur et alpha séparément
    let mut curr_c = "s0c".to_string();
    let mut curr_a = "s0a".to_string();
    let mut curr_duration = durations_s[0];
    
    for i in 0..(n - 1) {
        let fade_i = durations_s[i].min(fade_s);
        if fade_i <= 1e-6 {
            let out_c = format!("cc{}", i);
            let out_a = format!("ca{}", i);
            filter_lines.push(format!("[{}][s{}c]concat=n=2:v=1:a=0[{}]", curr_c, i + 1, out_c));
            filter_lines.push(format!("[{}][s{}a]concat=n=2:v=1:a=0[{}]", curr_a, i + 1, out_a));
            curr_c = out_c;
            curr_a = out_a;
            curr_duration += durations_s[i + 1];
        } else {
            let out_c = format!("xc{}", i);
            let out_a = format!("xa{}", i);
            let offset = (curr_duration - fade_i).max(0.0);
            filter_lines.push(format!(
                "[{}][s{}c]xfade=transition=fade:duration={:.6}:offset={:.6}[{}]",
                curr_c, i + 1, fade_i, offset, out_c
            ));
            filter_lines.push(format!(
                "[{}][s{}a]xfade=transition=fade:duration={:.6}:offset={:.6}[{}]",
                curr_a, i + 1, fade_i, offset, out_a
            ));
            curr_c = out_c;
            curr_a = out_a;
            curr_duration = curr_duration + durations_s[i + 1] - fade_i;
        }
    }
    
    // Reconstituer RGBA pour l'overlay final
    filter_lines.push(format!("[{}][{}]alphamerge,format=yuva444p[overlay]", curr_c, curr_a));
    
    // Construction de la vidéo de fond [bg]
    let avail_bg_after = (total_bg_s - start_s).max(0.0);
    let need_black_full = pre_videos.is_empty() || avail_bg_after <= 1e-6;
    
    let bg_label = if need_black_full {
        let color_full_idx = current_idx;
        cmd.extend_from_slice(&[
            "-f".to_string(), "lavfi".to_string(),
            "-i".to_string(), format!("color=c=black:s={}x{}:r={}:d={:.6}", w, h, fps, duration_s),
        ]);
        current_idx += 1;
        format!("{}:v", color_full_idx)
    } else {
        let prev = if pre_videos.len() > 1 {
            let mut ins = String::new();
            for i in 0..pre_videos.len() {
                ins.push_str(&format!("[{}:v]", bg_start_idx + i));
            }
            filter_lines.push(format!("{}concat=n={}:v=1:a=0[bgcat]", ins, pre_videos.len()));
            "bgcat".to_string()
        } else {
            format!("{}:v", bg_start_idx)
        };
        
        filter_lines.push(format!("[{}]trim=start={:.6},setpts=PTS-STARTPTS[bgtrim]", prev, start_s));
        let mut bg_label = "bgtrim".to_string();
        
        if avail_bg_after + 1e-6 < duration_s {
            let remain = duration_s - avail_bg_after;
            let color_pad_idx = current_idx;
            cmd.extend_from_slice(&[
                "-f".to_string(), "lavfi".to_string(),
                "-i".to_string(), format!("color=c=black:s={}x{}:r={}:d={:.6}", w, h, fps, remain),
            ]);
            current_idx += 1;
            filter_lines.push(format!("[bgtrim][{}:v]concat=n=2:v=1:a=0[bg]", color_pad_idx));
            bg_label = "bg".to_string();
        }
        
        bg_label
    };
    
    // Superposition de l'overlay (avec alpha) sur le fond
    filter_lines.push(format!("[{}][overlay]overlay=shortest=1:x=0:y=0,format=yuv420p[vout]", bg_label));
    
    // Audio: concat, skip start_s, clamp à duration_s
    if have_audio {
        let a = audio_paths.len();
        if a == 1 {
            let a0 = format!("{}:a", audio_start_idx);
            filter_lines.push(format!("[{}]aresample=48000[aa0]", a0));
            filter_lines.push(format!("[aa0]atrim=start={:.6},asetpts=PTS-STARTPTS,atrim=end={:.6}[aout]", start_s, duration_s));
        } else {
            for j in 0..a {
                let idx = audio_start_idx + j;
                filter_lines.push(format!("[{}:a]aresample=48000[aa{}]", idx, j));
            }
            let mut ins = String::new();
            for j in 0..a {
                ins.push_str(&format!("[aa{}]", j));
            }
            filter_lines.push(format!("{}concat=n={}:v=0:a=1[aacat]", ins, a));
            filter_lines.push(format!("[aacat]atrim=start={:.6},asetpts=PTS-STARTPTS,atrim=end={:.6}[aout]", start_s, duration_s));
        }
    }
    
    let filter_complex = filter_lines.join(";");
    
    // Écrit le filtergraph dans un fichier temporaire
    let tmp_dir = if let Some(cwd) = imgs_cwd {
        PathBuf::from(cwd)
    } else {
        std::env::temp_dir()
    };
    fs::create_dir_all(&tmp_dir).ok();
    
    let fg_hash = format!("{:x}", md5::compute(filter_complex.as_bytes()));
    let fg_path = tmp_dir.join(format!("filter-{}.ffgraph", &fg_hash[..8]));
    
    fs::write(&fg_path, &filter_complex)?;
    println!("[ffmpeg] filter_complex_script -> {:?}", fg_path);
    
    let fg_name = if imgs_cwd.is_some() {
        fg_path.file_name().unwrap().to_string_lossy().to_string()
    } else {
        fg_path.to_string_lossy().to_string()
    };
    
    cmd.extend_from_slice(&["-filter_complex_script".to_string(), fg_name]);
    
    // Mapping
    cmd.extend_from_slice(&["-map".to_string(), "[vout]".to_string()]);
    if have_audio {
        cmd.extend_from_slice(&["-map".to_string(), "[aout]".to_string()]);
    }
    
    // Codec vidéo + audio
    cmd.extend_from_slice(&["-r".to_string(), fps.to_string(), "-c:v".to_string(), vcodec]);
    if let Some(Some(preset)) = vextra.get("preset") {
        cmd.extend_from_slice(&["-preset".to_string(), preset.clone()]);
    }
    cmd.extend(vparams);
    
    if have_audio {
        cmd.extend_from_slice(&["-c:a".to_string(), "aac".to_string(), "-b:a".to_string(), "192k".to_string()]);
    }
    
    // Assure la durée exacte
    cmd.extend_from_slice(&["-t".to_string(), format!("{:.6}", duration_s)]);
    
    // Faststart pour formats MP4/MOV
    let ext = Path::new(out_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    if matches!(ext.as_str(), "mp4" | "mov" | "m4v") {
        cmd.extend_from_slice(&["-movflags".to_string(), "+faststart".to_string()]);
    }
    
    // Fichier de sortie
    cmd.push(out_path.to_string());
    
    println!("[ffmpeg] Commande:");
    let preview = if cmd.len() > 14 {
        format!("{} ...", cmd[..14].join(" "))
    } else {
        cmd.join(" ")
    };
    println!("  {}", preview);
    
    // Exécution
    let mut command = Command::new(&cmd[0]);
    command.args(&cmd[1..]);
    
    if let Some(cwd) = imgs_cwd {
        command.current_dir(cwd);
    }
    
    let status = command.status()?;
    if !status.success() {
        return Err(Box::new(std::io::Error::new(std::io::ErrorKind::Other, "FFmpeg command failed")));
    }
    
    Ok(())
}

#[tauri::command]
pub async fn export_video(
    export_id: String,
    imgs_folder: String,
    final_file_path: String,
    fps: i32,
    fade_duration: i32,
    start_time: i32,
    duration: Option<i32>,
    audios: Option<Vec<String>>,
    videos: Option<Vec<String>>,
) -> Result<String, String> {
    let t0 = Instant::now();
    
    // Logs init
    println!("[start_export] export_id={}", export_id);
    println!("[start_export] imgs_folder={}", imgs_folder);
    println!("[start_export] final_file_path={}", final_file_path);
    println!("[start_export] fps={}, fade_duration(ms)={}", fps, fade_duration);
    println!("[env] CPU cores: {:?}", std::thread::available_parallelism().map(|n| n.get()));
    
    if let Some(ref audios) = audios {
        println!("[audio] {} fichier(s) audio fourni(s)", audios.len());
    } else {
        println!("[audio] aucun fichier audio fourni");
    }
    
    if let Some(ref videos) = videos {
        println!("[video] {} fichier(s) vidéo fourni(s)", videos.len());
    } else {
        println!("[video] aucune vidéo de fond fournie");
    }
    
    // Liste des PNG triés par timestamp
    let folder = Path::new(&imgs_folder);
    println!("[scan] Parcours du dossier: {:?}", folder.canonicalize().unwrap_or_else(|_| folder.to_path_buf()));
    
    let mut files: Vec<_> = fs::read_dir(folder)
        .map_err(|e| format!("Erreur lecture dossier: {}", e))?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let path = entry.path();
            if path.extension()?.to_str()?.to_lowercase() == "png" {
                Some(path)
            } else {
                None
            }
        })
        .collect();
    
    files.sort_by_key(|p| {
        p.file_stem()
            .and_then(|s| s.to_str())
            .and_then(|s| s.parse::<i32>().ok())
            .unwrap_or(0)
    });
    
    println!("[scan] {} image(s) trouvée(s)", files.len());
    
    if files.is_empty() {
        return Err("Aucune image .png trouvée dans imgs_folder".to_string());
    }
    
    let first_stem = files[0]
        .file_stem()
        .and_then(|s| s.to_str())
        .and_then(|s| s.parse::<i32>().ok())
        .unwrap_or(-1);
    
    if first_stem != 0 {
        return Err("La première image doit être '0.png' (timestamp 0 ms).".to_string());
    }
    
    // Timeline et chemins
    let ts: Vec<i32> = files
        .iter()
        .map(|p| {
            p.file_stem()
                .and_then(|s| s.to_str())
                .and_then(|s| s.parse::<i32>().ok())
                .unwrap_or(0)
        })
        .collect();
    
    let path_strs: Vec<String> = files
        .iter()
        .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
        .collect();
    
    let ts_preview: Vec<i32> = ts.iter().take(10).cloned().collect();
    println!("[timeline] Premiers timestamps: {:?}{}", ts_preview, if ts.len() > 10 { " ..." } else { "" });
    println!("[timeline] Nombre d'images: {}", ts.len());
    
    // Taille cible = taille de 0.png
    println!("[image] Ouverture de la première image pour taille cible...");
    let target_size = {
        let img_data = fs::read(&files[0]).map_err(|e| format!("Erreur lecture image: {}", e))?;
        let img = image::load_from_memory(&img_data).map_err(|e| format!("Erreur décodage image: {}", e))?;
        (img.width() as i32, img.height() as i32)
    };
    
    println!("[image] Taille cible: {}x{}", target_size.0, target_size.1);
    
    // Durée totale
    let fade_ms = fade_duration;
    let tail_ms = fade_ms.max(1000);
    let total_duration_ms = ts[ts.len() - 1] + tail_ms;
    let duration_s = total_duration_ms as f64 / 1000.0;
    println!("[timeline] Durée totale: {} ms ({:.3} s)", total_duration_ms, duration_s);
    println!("[perf] Préparation terminée en {:.0} ms", t0.elapsed().as_millis());
    
    let out_path = Path::new(&final_file_path);
    if let Some(parent) = out_path.parent() {
        println!("[fs] Création du dossier de sortie si besoin: {:?}", parent);
        fs::create_dir_all(parent).map_err(|e| format!("Erreur création dossier: {}", e))?;
    }
    
    let imgs_folder_resolved = folder.canonicalize()
        .map_err(|e| format!("Erreur résolution chemin: {}", e))?
        .to_string_lossy()
        .to_string();
    
    let out_path_str = out_path.to_string_lossy().to_string();
    let audios_vec = audios.unwrap_or_default();
    let videos_vec = videos.unwrap_or_default();
    
    task::spawn_blocking(move || {
        build_and_run_ffmpeg_filter_complex(
            &out_path_str,
            &path_strs,
            &ts,
            target_size,
            fps,
            fade_ms,
            start_time,
            &audios_vec,
            &videos_vec,
            true,
            Some(&imgs_folder_resolved),
            duration,
        )
    }).await
    .map_err(|e| format!("Erreur tâche: {}", e))?
    .map_err(|e| format!("Erreur ffmpeg: {}", e))?;
    
    let export_time_s = t0.elapsed().as_secs_f64();
    *LAST_EXPORT_TIME_S.lock().unwrap() = Some(export_time_s);
    println!("[done] Export terminé en {:.2}s", export_time_s);
    println!("[metric] export_time_seconds={:.3}", export_time_s);
    
    Ok(final_file_path)
}
