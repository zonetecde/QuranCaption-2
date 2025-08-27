# -*- coding: utf-8 -*-
# Script MoviePy optimisé pour: milliers d'images, RAM faible (cache LRU), crossfade entre TOUTES les images,
# logs très verbeux + % d'avancement ffmpeg, et encodage plus rapide (preset=ultrafast).
import asyncio
import time
import os
from pathlib import Path
from functools import lru_cache
from bisect import bisect_right
from typing import List, Optional, Tuple, Dict
import numpy as np
from PIL import Image
from moviepy.editor import VideoClip, AudioFileClip, concatenate_audioclips, VideoFileClip, concatenate_videoclips, CompositeVideoClip
from proglog import ProgressBarLogger
import subprocess
import tempfile
import hashlib

# Expose la dernière durée d'export terminée (en secondes)
LAST_EXPORT_TIME_S: Optional[float] = None


def _resolve_ffmpeg_binary() -> Optional[str]:
    """Essaye d'utiliser le binaire ffmpeg local si présent, sinon laisse MoviePy gérer."""
    # Honorer un override externe si déjà fourni
    if os.environ.get("IMAGEIO_FFMPEG_EXE") and Path(os.environ["IMAGEIO_FFMPEG_EXE"]).exists():
        return os.environ["IMAGEIO_FFMPEG_EXE"]
    # Binaire embarqué (Windows)
    local_bin = Path(__file__).resolve().parent.parent / "binaries" / ("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
    if local_bin.exists():
        os.environ["IMAGEIO_FFMPEG_EXE"] = str(local_bin)
        return str(local_bin)
    return None


def _resolve_ffprobe_binary() -> str:
    """Retourne le chemin de ffprobe embarqué si présent, sinon 'ffprobe'."""
    local_bin = Path(__file__).resolve().parent.parent / "binaries" / ("ffprobe.exe" if os.name == "nt" else "ffprobe")
    if local_bin.exists():
        return str(local_bin)
    return "ffprobe"


def _probe_hw_encoders(ffmpeg_path: Optional[str]) -> List[str]:
    """Retourne la liste des encodeurs matériels h264 disponibles par ordre de préférence."""
    try:
        exe = ffmpeg_path or "ffmpeg"
        out = subprocess.check_output([exe, "-hide_banner", "-encoders"], stderr=subprocess.STDOUT, timeout=5)
        txt = out.decode(errors="ignore").lower()
    except Exception:
        return []
    found: List[str] = []
    if "h264_nvenc" in txt:
        found.append("h264_nvenc")
    if "h264_qsv" in txt:
        found.append("h264_qsv")
    if "h264_amf" in txt:
        found.append("h264_amf")
    return found


def _choose_best_codec(prefer_hw: bool = True) -> Tuple[str, List[str], Dict[str, Optional[str]]]:
    """Choisit le meilleur codec dispo. Retourne (codec, ffmpeg_params_suppl, extra_write_kwargs)."""
    ffmpeg_exe = _resolve_ffmpeg_binary()
    hw = _probe_hw_encoders(ffmpeg_exe) if prefer_hw else []
    # Préférences: NVENC > QSV > AMF
    if hw:
        codec = hw[0]
        params: List[str] = ["-pix_fmt", "yuv420p"]
        extra: Dict[str, Optional[str]] = {"preset": None}  # éviter de passer "ultrafast" pour NVENC/QSV/AMF
        return codec, params, extra
    # Fallback libx264
    codec = "libx264"
    params = [
        "-pix_fmt", "yuv420p",
        "-crf", "22",
        "-tune", "zerolatency",
        "-bf", "0",
    ]
    extra = {"preset": "ultrafast"}
    return codec, params, extra


class VeryVerboseFFmpegLogger(ProgressBarLogger):
    # Logger pour afficher messages détaillés + % d'avancement de ffmpeg
    def __init__(self):
        super().__init__()
        self._last_percent = {}

    def callback(self, **changes):
        if 'message' in changes:
            print(f"[MoviePy] {changes['message']}")

    def bars_callback(self, bar, attr, value, old_value=None):
        if attr == 'index':
            total = self.bars.get(bar, {}).get('total', None)
            if total:
                percent = int((value / total) * 100)
                if self._last_percent.get(bar) != percent:
                    self._last_percent[bar] = percent
                    print(f"[ffmpeg] {bar}: {percent}% ({value}/{total})")


def _ffmpeg_preprocess_video(src: str, dst: str, w: int, h: int, fps: int, prefer_hw: bool = True) -> None:
    """Redimensionne/pad une vidéo vers (w,h) et la rééchantillonne à fps via ffmpeg (beaucoup plus rapide)."""
    codec, params, extra = _choose_best_codec(prefer_hw=prefer_hw)
    exe = _resolve_ffmpeg_binary() or "ffmpeg"
    # scale pour conserver le ratio, puis pad pour remplir
    vf = f"scale=w={w}:h={h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black,fps={fps}"
    cmd = [
        exe,
        "-y",
        "-hide_banner",
        "-loglevel", "error",
        "-i", src,
        "-an",  # pas d'audio pour le fond
        "-vf", vf,
        "-pix_fmt", "yuv420p",
        "-c:v", codec,
    ]
    # preset uniquement si libx264
    if extra.get("preset") is not None:
        cmd += ["-preset", extra["preset"]]
    # autres paramètres
    cmd += params
    cmd += [dst]
    print(f"[preproc] ffmpeg scale+pad -> {Path(dst).name}")
    subprocess.run(cmd, check=True)


def _preprocess_background_videos(video_paths: List[str], w: int, h: int, fps: int, prefer_hw: bool = True) -> List[str]:
    out_paths: List[str] = []
    cache_dir = Path(tempfile.gettempdir()) / "qurancaption-preproc"
    cache_dir.mkdir(parents=True, exist_ok=True)
    for p in video_paths:
        stem_hash = hashlib.md5((p + f"-{w}x{h}-{fps}").encode("utf-8", errors="ignore")).hexdigest()[:10]
        dst = cache_dir / f"bg-{stem_hash}-{w}x{h}-{fps}.mp4"
        if not dst.exists():
            try:
                _ffmpeg_preprocess_video(p, str(dst), w, h, fps, prefer_hw=prefer_hw)
            except Exception as e:
                print("[preproc][ERREUR]", repr(e))
                # En cas d'échec, on utilisera la vidéo originale (avec resize Python en dernier recours)
                out_paths.append(p)
                continue
        out_paths.append(str(dst))
    return out_paths


def _ffprobe_duration_sec(path: str) -> float:
    """Retourne la durée en secondes d’un média via ffprobe, ou 0.0 si inconnu."""
    try:
        exe = _resolve_ffprobe_binary()
        out = subprocess.check_output([
            exe,
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=nokey=1:noprint_wrappers=1",
            path,
        ], stderr=subprocess.STDOUT, timeout=10)
        txt = out.decode(errors="ignore").strip()
        return float(txt) if txt else 0.0
    except Exception:
        return 0.0


def _build_and_run_ffmpeg_filter_complex(
    out_path: str,
    image_paths: List[str],
    timestamps_ms: List[int],
    target_size: Tuple[int, int],
    fps: int,
    fade_duration_ms: int,
    start_time_ms: int,
    audio_paths: Optional[List[str]],
    bg_videos: Optional[List[str]],
    prefer_hw: bool = True,
    imgs_cwd: Optional[str] = None,
) -> None:
    """Construit et exécute une commande ffmpeg filter_complex pour composer PNG + crossfade, vidéo de fond et audio.
    - Une seule entrée vidéo via le concat demuxer (fichier .ffconcat) pour éviter d’ouvrir N inputs -> RAM faible
    - Écrit le filtergraph dans un fichier temporaire dans le dossier images et utilise -filter_complex_script
    - Utilise cwd=imgs_cwd pour référencer les PNG par leur nom simple
    - Gère la transparence via extractplanes/alphamerge (pas d’option alpha sur xfade)
    """
    W, H = target_size
    fade_s = max(0.0, float(fade_duration_ms) / 1000.0)
    start_s = max(0.0, float(start_time_ms) / 1000.0)

    # Durées de chaque segment image
    n = len(image_paths)
    assert n == len(timestamps_ms)
    if n == 0:
        raise ValueError("Aucune image fournie")

    tail_ms = max(1000, fade_duration_ms)
    durations_s: List[float] = []
    for i in range(n):
        if i < n - 1:
            durations_s.append(max(0.001, (timestamps_ms[i + 1] - timestamps_ms[i]) / 1000.0))
        else:
            durations_s.append(max(0.001, tail_ms / 1000.0))
    total_by_ts = (timestamps_ms[-1] + tail_ms) / 1000.0
    duration_s = total_by_ts

    # Offsets cumulés pour trim/xfade
    starts_s: List[float] = []
    acc = 0.0
    for d in durations_s:
        starts_s.append(acc)
        acc += d

    # Détection codec
    vcodec, vparams, vextra = _choose_best_codec(prefer_hw=prefer_hw)

    # Pré-traitement/choix vidéos de fond + durée totale
    pre_videos: List[str] = []
    if bg_videos:
        try:
            pre_videos = _preprocess_background_videos(bg_videos, W, H, fps, prefer_hw=prefer_hw)
        except Exception as e:
            print("[video][preproc][ERREUR]", repr(e))
            pre_videos = bg_videos
    total_bg_s = 0.0
    for p in (pre_videos or []):
        total_bg_s += _ffprobe_duration_sec(p)

    # Durée totale audio pour décider si l’on mappe l’audio
    total_audio_s = 0.0
    if audio_paths:
        for p in audio_paths:
            total_audio_s += _ffprobe_duration_sec(p)
    have_audio = bool(audio_paths) and (start_s < total_audio_s - 1e-6)

    # Préparer le fichier concat (une seule entrée vidéo)
    concat_path: Optional[Path] = None
    try:
        base_dir = Path(imgs_cwd) if imgs_cwd else Path(tempfile.gettempdir())
        base_dir.mkdir(parents=True, exist_ok=True)
        concat_path = base_dir / ("images-" + hashlib.md5("|".join(image_paths).encode("utf-8")).hexdigest()[:8] + ".ffconcat")
        with open(concat_path, "w", encoding="utf-8") as f:
            f.write("ffconcat version 1.0\n")
            for i, p in enumerate(image_paths):
                f.write(f"file '{p}'\n")
                f.write(f"duration {durations_s[i]:.6f}\n")
            # Pour que la durée du dernier soit respectée
            f.write(f"file '{image_paths[-1]}'\n")
        print(f"[concat] Fichier ffconcat -> {concat_path}")
    except Exception as e:
        print("[concat][WARN] Échec écriture ffconcat:", repr(e))
        concat_path = None

    cmd: List[str] = []
    ffmpeg_exe = _resolve_ffmpeg_binary() or "ffmpeg"
    cmd += [ffmpeg_exe, "-y", "-hide_banner", "-loglevel", "info", "-stats"]

    current_idx = 0

    # Entrée unique: concat demuxer
    if concat_path is not None:
        cmd += ["-safe", "0", "-f", "concat", "-i", (concat_path.name if imgs_cwd else str(concat_path))]
    else:
        # Fallback: garder anciens multiples inputs (peu probable)
        for p, dur in zip(image_paths, durations_s):
            cmd += ["-loop", "1", "-t", f"{dur:.6f}", "-i", p]
            current_idx += 1
    current_idx = 1  # une seule entrée vidéo

    # Entrées vidéos de fond
    bg_start_idx = current_idx
    if pre_videos:
        for p in pre_videos:
            cmd += ["-i", p]
            current_idx += 1

    # Éventuelles entrées couleur (lavfi)
    color_full_idx: Optional[int] = None
    color_pad_idx: Optional[int] = None

    # Entrées audio
    audio_start_idx = current_idx
    if have_audio:
        for p in audio_paths or []:
            cmd += ["-i", p]
            current_idx += 1

    filter_lines: List[str] = []

    # Base: préparer le flux vidéo unique [0:v]
    filter_lines.append(
        f"[0:v]format=rgba,scale=w={W}:h={H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black@0,fps={fps},setsar=1,format=yuva444p,split={n}" + "".join(f"[b{i}]" for i in range(n))
    )

    # Pour chaque segment, extraire la fenêtre temporelle et séparer couleur/alpha
    for i in range(n):
        s = starts_s[i]
        e = s + durations_s[i]
        filter_lines.append(f"[b{i}]trim=start={s:.6f}:end={e:.6f},setpts=PTS-STARTPTS,split=2[s{i}witha][s{i}foralpha]")
        filter_lines.append(f"[s{i}foralpha]extractplanes=a[s{i}a]")
        filter_lines.append(f"[s{i}witha]format=yuv444p[s{i}c]")

    # Chaîne xfade pour couleur et alpha séparément
    curr_c = "s0c"
    curr_a = "s0a"
    curr_duration = durations_s[0]
    for i in range(n - 1):
        fade_i = min(durations_s[i], fade_s)
        if fade_i <= 1e-6:
            out_c = f"cc{i}"
            out_a = f"ca{i}"
            filter_lines.append(f"[{curr_c}][s{i+1}c]concat=n=2:v=1:a=0[{out_c}]")
            filter_lines.append(f"[{curr_a}][s{i+1}a]concat=n=2:v=1:a=0[{out_a}]")
            curr_c, curr_a = out_c, out_a
            curr_duration = curr_duration + durations_s[i + 1]
        else:
            out_c = f"xc{i}"
            out_a = f"xa{i}"
            offset = max(0.0, curr_duration - fade_i)
            filter_lines.append(
                f"[{curr_c}][s{i+1}c]xfade=transition=fade:duration={fade_i:.6f}:offset={offset:.6f}[{out_c}]"
            )
            filter_lines.append(
                f"[{curr_a}][s{i+1}a]xfade=transition=fade:duration={fade_i:.6f}:offset={offset:.6f}[{out_a}]"
            )
            curr_c, curr_a = out_c, out_a
            curr_duration = curr_duration + durations_s[i + 1] - fade_i

    # Reconstituer RGBA pour l’overlay final
    filter_lines.append(f"[{curr_c}][{curr_a}]alphamerge,format=yuva444p[overlay]")

    # Construction de la vidéo de fond [bg]
    bg_label: Optional[str] = None
    avail_bg_after = max(0.0, total_bg_s - start_s)
    need_black_full = (not pre_videos) or (avail_bg_after <= 1e-6)

    if need_black_full:
        color_full_idx = current_idx
        cmd += ["-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:r={fps}:d={duration_s:.6f}"]
        current_idx += 1
        bg_label = f"{color_full_idx}:v"
    else:
        if pre_videos and len(pre_videos) > 1:
            ins = "".join(f"[{bg_start_idx + i}:v]" for i in range(len(pre_videos)))
            filter_lines.append(f"{ins}concat=n={len(pre_videos)}:v=1:a=0[bgcat]")
            prev = "bgcat"
        else:
            prev = f"{bg_start_idx}:v"
        filter_lines.append(f"[{prev}]trim=start={start_s:.6f},setpts=PTS-STARTPTS[bgtrim]")
        bg_label = "bgtrim"
        if avail_bg_after + 1e-6 < duration_s:
            remain = duration_s - avail_bg_after
            color_pad_idx = current_idx
            cmd += ["-f", "lavfi", "-i", f"color=c=black:s={W}x{H}:r={fps}:d={remain:.6f}"]
            current_idx += 1
            filter_lines.append(f"[bgtrim][{color_pad_idx}:v]concat=n=2:v=1:a=0[bg]")
            bg_label = "bg"

    # Superposition de l’overlay (avec alpha) sur le fond
    filter_lines.append(f"[{bg_label}][overlay]overlay=shortest=1:x=0:y=0,format=yuv420p[vout]")

    # Audio: concat, skip start_s, clamp à duration_s
    if have_audio:
        A = len(audio_paths or [])
        if A == 1:
            a0 = f"{audio_start_idx}:a"
            filter_lines.append(f"[{a0}]aresample=48000[aa0]")
            filter_lines.append(f"[aa0]atrim=start={start_s:.6f},asetpts=PTS-STARTPTS,atrim=end={duration_s:.6f}[aout]")
        else:
            for j in range(A):
                idx = audio_start_idx + j
                filter_lines.append(f"[{idx}:a]aresample=48000[aa{j}]")
            ins = "".join(f"[aa{j}]" for j in range(A))
            filter_lines.append(f"{ins}concat=n={A}:v=0:a=1[aacat]")
            filter_lines.append(f"[aacat]atrim=start={start_s:.6f},asetpts=PTS-STARTPTS,atrim=end={duration_s:.6f}[aout]")

    filter_complex = ";".join(filter_lines)

    # Écrit le filtergraph dans un fichier temporaire situé dans le dossier des images
    fg_path: Optional[Path] = None
    try:
        tmp_dir = Path(imgs_cwd) if imgs_cwd else Path(tempfile.gettempdir())
        tmp_dir.mkdir(parents=True, exist_ok=True)
        fg_path = tmp_dir / ("filter-" + hashlib.md5(filter_complex.encode("utf-8")).hexdigest()[:8] + ".ffgraph")
        with open(fg_path, "w", encoding="utf-8") as f:
            f.write(filter_complex)
        print(f"[ffmpeg] filter_complex_script -> {fg_path}")
    except Exception as e:
        print("[ffmpeg][WARN] Échec écriture filtergraph:", repr(e))
        fg_path = None

    # Ajoute le script via -filter_complex_script (chemin relatif si cwd=imgs_cwd)
    if fg_path is not None:
        cmd += ["-filter_complex_script", str(fg_path.name if imgs_cwd else fg_path)]
    else:
        cmd += ["-filter_complex", filter_complex]

    # Mapping
    cmd += ["-map", "[vout]"]
    if have_audio:
        cmd += ["-map", "[aout]"]

    # Codec vidéo + audio
    cmd += ["-r", str(fps), "-c:v", vcodec]
    if vextra.get("preset") is not None:
        cmd += ["-preset", str(vextra["preset"])]
    cmd += vparams
    if have_audio:
        cmd += ["-c:a", "aac", "-b:a", "192k"]

    # Assure la durée exacte
    cmd += ["-t", f"{duration_s:.6f}"]

    # Faststart pour formats MP4/MOV
    try:
        ext = os.path.splitext(out_path)[1].lower()
    except Exception:
        ext = ""
    if ext in (".mp4", ".mov", ".m4v"):
        cmd += ["-movflags", "+faststart"]

    # Fichier de sortie
    cmd += [out_path]

    print("[ffmpeg] Commande:")
    try:
        preview = " ".join(cmd[:14]) + " ..."
        print("  ", preview)
    except Exception:
        pass

    # Exécution, en se plaçant dans le dossier des images pour raccourcir les chemins
    subprocess.run(cmd, check=True, cwd=(imgs_cwd or None))


async def start_export(
    export_id: str,
    imgs_folder: str,
    final_file_path: str,
    fps: int,
    fade_duration: int,
    audios: Optional[List[str]] = None,
    start_time: int = 0,
    videos: Optional[List[str]] = None,
) -> str:
    prefer_hw = True
    
    # Logs init
    t0 = time.time()
    print(f"[start_export] export_id={export_id}")
    print(f"[start_export] imgs_folder={imgs_folder}")
    print(f"[start_export] final_file_path={final_file_path}")
    print(f"[start_export] fps={fps}, fade_duration(ms)={fade_duration}")
    print(f"[env] CPU cores: {os.cpu_count()}")
    if audios:
        print(f"[audio] {len(audios)} fichier(s) audio fourni(s)")
    else:
        print("[audio] aucun fichier audio fourni")
    if videos:
        print(f"[video] {len(videos)} fichier(s) vidéo fourni(s)")
    else:
        print("[video] aucune vidéo de fond fournie")

    # Liste des PNG triés par timestamp
    folder = Path(imgs_folder)
    print(f"[scan] Parcours du dossier: {folder.resolve()}")
    files = sorted([p for p in folder.iterdir() if p.suffix.lower() == ".png"], key=lambda p: int(p.stem))
    print(f"[scan] {len(files)} image(s) trouvée(s)")

    if not files:
        raise ValueError("Aucune image .png trouvée dans imgs_folder")
    if int(files[0].stem) != 0:
        raise ValueError("La première image doit être '0.png' (timestamp 0 ms).")

    # Timeline et chemins
    ts: List[int] = [int(p.stem) for p in files]
    paths: List[Path] = files
    # Utilise uniquement les noms de fichiers pour ffmpeg (nous allons cwd dans ce dossier)
    path_strs: List[str] = [p.name for p in paths]
    print(f"[timeline] Premiers timestamps: {ts[:10]}{' ...' if len(ts) > 10 else ''}")
    print(f"[timeline] Nombre d'images: {len(ts)}")

    # Taille cible = taille de 0.png
    print("[image] Ouverture de la première image pour taille cible...")
    with Image.open(paths[0]) as im0:
        im0 = im0.convert("RGBA")
        target_size = im0.size
    print(f"[image] Taille cible: {target_size[0]}x{target_size[1]}")

    # Durée totale
    fade_ms = int(fade_duration)
    tail_ms = max(1000, fade_ms)
    total_duration_ms = ts[-1] + tail_ms
    duration_s = total_duration_ms / 1000.0
    print(f"[timeline] Durée totale: {total_duration_ms} ms ({duration_s:.3f} s)")
    print(f"[perf] Préparation terminée en {(time.time()-t0)*1000:.0f} ms")

    out_path = Path(final_file_path).resolve()
    if out_path.parent:
        print(f"[fs] Création du dossier de sortie si besoin: {out_path.parent}")
        os.makedirs(out_path.parent, exist_ok=True)

    def _run():
        _build_and_run_ffmpeg_filter_complex(
            out_path=str(out_path),
            image_paths=path_strs,  # noms simples
            timestamps_ms=ts,
            target_size=target_size,
            fps=fps,
            fade_duration_ms=fade_ms,
            start_time_ms=start_time,
            audio_paths=audios or [],
            bg_videos=videos or [],
            prefer_hw=True,
            imgs_cwd=str(folder.resolve()),
        )

    print("[ffmpeg] Lancement de la commande (thread)...")
    await asyncio.to_thread(_run)

    export_time_s = time.time() - t0
    global LAST_EXPORT_TIME_S
    LAST_EXPORT_TIME_S = export_time_s
    print(f"[done] Export terminé en {export_time_s:.2f}s")
    print(f"[metric] export_time_seconds={export_time_s:.3f}")

    return str(out_path)


# --- Exécution directe ---
if __name__ == "__main__":
    async def main():
        img_folder = r"C:\Users\zonedetec\AppData\Roaming\com.qurancaption\exports\1756312363384407"
        fade_duration = 500
        fps = 30
        final_file_path = "./output.mp4"
        audios=[r"F:\Annexe\Montage vidéo\quran.al.luhaidan\196\تلاوة أحمد ديبان رواية ورش عام 1443 سورة 003  آل عمران.mp3"]
        videos=[r"F:\Annexe\Montage vidéo\quran.al.luhaidan\199\video_4027.mp4"]
        #videos = []
        start_time = 4000
        export_id = "0"
        try:
            print("[main] Démarrage start_export()")
            path = await start_export(export_id, img_folder, final_file_path, fps, fade_duration, audios, start_time, videos)
            print("[main] OK ->", path)
            # Affiche la durée depuis la variable de module pour vérification
            print("[main] LAST_EXPORT_TIME_S=", LAST_EXPORT_TIME_S)
        except Exception as e:
            print("[main][ERREUR]", repr(e))

    asyncio.run(main())