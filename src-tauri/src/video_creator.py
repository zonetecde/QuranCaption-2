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
    path_strs: List[str] = [str(p) for p in paths]
    print(f"[timeline] Premiers timestamps: {ts[:10]}{' ...' if len(ts) > 10 else ''}")
    print(f"[timeline] Nombre d'images: {len(ts)}")

    # Taille cible = taille de 0.png
    print("[image] Ouverture de la première image pour taille cible...")
    with Image.open(paths[0]) as im0:
        im0 = im0.convert("RGBA")
        target_size = im0.size
    print(f"[image] Taille cible: {target_size[0]}x{target_size[1]}")

    # Durée totale (dernière image + queue)
    fade_ms = int(fade_duration)
    tail_ms = max(1000, fade_ms)
    total_duration_ms = ts[-1] + tail_ms
    duration_s = total_duration_ms / 1000.0
    print(f"[timeline] Durée totale: {total_duration_ms} ms ({duration_s:.3f} s)")
    print(f"[perf] Préparation terminée en {(time.time()-t0)*1000:.0f} ms")

    # Cache LRU: garde 3 images chargées et prémultipliées en uint8 (plus rapide au rendu)
    @lru_cache(maxsize=3)
    def load_premultiplied_rgb_u8(path_str: str) -> np.ndarray:
        # Charge PNG -> RGBA -> applique alpha en entier -> renvoie uint8 (H,W,3)
        print(f"[cache] load (miss): {path_str}")
        p = Path(path_str)
        with Image.open(p) as im:
            im = im.convert("RGBA")
            if im.size != target_size:
                print(f"[resize] Adaptation au canevas {target_size} (collage en 0,0, pas de redimensionnement)")
                canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
                canvas.paste(im, (0, 0))
                im = canvas
            arr = np.asarray(im, dtype=np.uint8)
        rgb = arr[..., :3].astype(np.uint16)
        a = arr[..., 3:4].astype(np.uint16)
        # prémultiplication int: round((rgb * a) / 255)
        premul = (rgb * a + 127) // 255
        return premul.astype(np.uint8)

    # Helpers pour overlay: cache image prémultipliée + alpha
    @lru_cache(maxsize=3)
    def load_premul_and_alpha_u8(path_str: str) -> Tuple[np.ndarray, np.ndarray]:
        p = Path(path_str)
        with Image.open(p) as im:
            im = im.convert("RGBA")
            if im.size != target_size:
                canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
                canvas.paste(im, (0, 0))
                im = canvas
            arr = np.asarray(im, dtype=np.uint8)
        rgb = arr[..., :3].astype(np.uint16)
        a = arr[..., 3:4].astype(np.uint16)
        premul = (rgb * a + 127) // 255  # uint16
        return premul.astype(np.uint8), a.astype(np.uint8)

    def premul_to_rgb_u8(premul_u8: np.ndarray, a_u8: np.ndarray) -> np.ndarray:
        a = a_u8.astype(np.uint16)
        prem = premul_u8.astype(np.uint16)
        # Éviter division par 0
        rgb_u16 = np.where(a > 0, (prem * 255 + (a // 2)) // a, 0)
        return np.clip(rgb_u16, 0, 255).astype(np.uint8)

    # Mémo pour éviter double calcul des composantes overlay (premul + alpha)
    last_comp: Dict[str, Optional[object]] = {"t_ms": None, "premul": None, "alpha": None}

    def compute_overlay_components(t_ms: int) -> Tuple[np.ndarray, np.ndarray]:
        # Cache par timestamp
        if last_comp["t_ms"] == t_ms and last_comp["premul"] is not None and last_comp["alpha"] is not None:
            return last_comp["premul"], last_comp["alpha"]  # type: ignore[return-value]
        # Trouver image courante
        i = max(0, bisect_right(ts, t_ms) - 1)
        if i >= len(ts):
            i = len(ts) - 1
        # Crossfade éventuel
        if i < len(ts) - 1:
            delta_ms = ts[i + 1] - ts[i]
            win_ms = min(delta_ms, fade_ms)
            start_ms = ts[i + 1] - win_ms
            if win_ms > 0 and start_ms <= t_ms < ts[i + 1]:
                w_num = t_ms - start_ms
                denom = win_ms
                prem_a, a_a = load_premul_and_alpha_u8(path_strs[i])
                prem_b, a_b = load_premul_and_alpha_u8(path_strs[i + 1])
                a32 = a_a.astype(np.uint32)
                b32 = a_b.astype(np.uint32)
                prem32_a = prem_a.astype(np.uint32)
                prem32_b = prem_b.astype(np.uint32)
                prem_mix = ((prem32_a * (denom - w_num) + prem32_b * w_num) // denom).astype(np.uint8)
                a_mix = ((a32 * (denom - w_num) + b32 * w_num) // denom).astype(np.uint8)
                last_comp["t_ms"] = t_ms
                last_comp["premul"] = prem_mix
                last_comp["alpha"] = a_mix
                return prem_mix, a_mix
        # Pas de crossfade
        prem, a = load_premul_and_alpha_u8(path_strs[i])
        last_comp["t_ms"] = t_ms
        last_comp["premul"] = prem
        last_comp["alpha"] = a
        return prem, a

    # Etat de log pour éviter le spam
    state = {"last_img_index": None, "last_cross_bucket": None, "last_second_printed": -1}

    # Générateur de frames
    def make_frame(t: float) -> np.ndarray:
        t_ms = int(round(t * 1000.0))
        if t_ms >= total_duration_ms:
            t_ms = total_duration_ms - 1

        # Log 1x/s
        sec = t_ms // 1000
        if sec != state["last_second_printed"]:
            state["last_second_printed"] = sec
            overall = int((t_ms / total_duration_ms) * 100)
            print(f"[frame] t={t_ms} ms (sec {sec}) | progression ~{overall}%")

        # Trouve i tel que ts[i] <= t < ts[i+1] (ou i = dernière)
        i = max(0, bisect_right(ts, t_ms) - 1)
        if i >= len(ts):
            i = len(ts) - 1

        if i != state["last_img_index"]:
            state["last_img_index"] = i
            if i < len(ts) - 1:
                print(f"[image] -> index={i}, ts={ts[i]} ms (vers {ts[i+1]} ms)")
            else:
                print(f"[image] -> dernière index={i}, ts={ts[i]} ms")

        img_a = load_premultiplied_rgb_u8(path_strs[i])

        # Crossfade entre toutes les images: fondu sur la fenêtre min(delta, fade_ms) avant l'image suivante
        if i < len(ts) - 1:
            delta_ms = ts[i + 1] - ts[i]
            win_ms = min(delta_ms, fade_ms)
            start_ms = ts[i + 1] - win_ms
            if win_ms > 0 and start_ms <= t_ms < ts[i + 1]:
                w_num = t_ms - start_ms  # numérateur entier
                denom = win_ms           # dénominateur
                w = w_num / float(denom)
                bucket = int(w * 10)
                if bucket != state["last_cross_bucket"]:
                    state["last_cross_bucket"] = bucket
                    print(f"[crossfade] i={i}->{i+1} ~{w*100:.0f}% t={t_ms} ms (fenêtre {win_ms} ms)")
                img_b = load_premultiplied_rgb_u8(path_strs[i + 1])
                # Mixage entier (évite le float) avec précision suffisante
                a32 = img_a.astype(np.uint32)
                b32 = img_b.astype(np.uint32)
                mix = ((a32 * (denom - w_num) + b32 * w_num) // denom).astype(np.uint8)
                return mix
            else:
                state["last_cross_bucket"] = None
                return img_a
        else:
            state["last_cross_bucket"] = None
            return img_a

    # Générateur de frames overlay (RGB non prémultiplié)
    state = {"last_img_index": None, "last_cross_bucket": None, "last_second_printed": -1}
    def overlay_make_frame(t: float) -> np.ndarray:
        t_ms = int(round(t * 1000.0))
        if t_ms >= total_duration_ms:
            t_ms = total_duration_ms - 1

        # Logs 1x/s
        sec = t_ms // 1000
        if sec != state["last_second_printed"]:
            state["last_second_printed"] = sec
            overall = int((t_ms / total_duration_ms) * 100)
            print(f"[frame] t={t_ms} ms (sec {sec}) | progression ~{overall}%")

        # Index/logs
        i = max(0, bisect_right(ts, t_ms) - 1)
        if i >= len(ts):
            i = len(ts) - 1

        if i != state["last_img_index"]:
            state["last_img_index"] = i
            if i < len(ts) - 1:
                print(f"[image] -> index={i}, ts={ts[i]} ms (vers {ts[i+1]} ms)")
            else:
                print(f"[image] -> dernière index={i}, ts={ts[i]} ms")

        # Crossfade bucket
        if i < len(ts) - 1:
            delta_ms = ts[i + 1] - ts[i]
            win_ms = min(delta_ms, fade_ms)
            start_ms = ts[i + 1] - win_ms
            if win_ms > 0 and start_ms <= t_ms < ts[i + 1]:
                w = (t_ms - start_ms) / float(win_ms)
                bucket = int(w * 10)
                if bucket != state["last_cross_bucket"]:
                    state["last_cross_bucket"] = bucket
                    print(f"[crossfade] i={i}->{i+1} ~{w*100:.0f}% t={t_ms} ms (fenêtre {win_ms} ms)")
            else:
                state["last_cross_bucket"] = None
        else:
            state["last_cross_bucket"] = None

        prem, a = compute_overlay_components(t_ms)
        return premul_to_rgb_u8(prem, a)

    def overlay_make_mask(t: float) -> np.ndarray:
        t_ms = int(round(t * 1000.0))
        if t_ms >= total_duration_ms:
            t_ms = total_duration_ms - 1
        _, a = compute_overlay_components(t_ms)
        # a est (H,W,1) -> mask attendu (H,W) float in [0,1]
        return (a.squeeze(-1).astype(np.float32) / 255.0)

    overlay_clip = VideoClip(make_frame=overlay_make_frame, duration=duration_s).set_fps(fps)
    mask_clip = VideoClip(make_frame=overlay_make_mask, duration=duration_s, ismask=True).set_fps(fps)
    overlay_clip = overlay_clip.set_mask(mask_clip)
    print("[moviepy] Overlay (images) prêt.")

    # Préparer la vidéo de fond si fournie
    bg_clip = None
    bg_loaded: List[VideoFileClip] = []
    if videos:
        try:
            start_s = max(0.0, start_time / 1000.0)
            # Prétraiter toutes les vidéos côté ffmpeg (scale+pad vers la taille cible et fps voulu)
            pre_videos = _preprocess_background_videos(videos, target_size[0], target_size[1], fps, prefer_hw=prefer_hw)
            bg_loaded = [VideoFileClip(p).without_audio() for p in pre_videos]
            v_durs = [c.duration for c in bg_loaded]
            total_v = float(sum(v_durs))
            print(f"[video] total_video={total_v:.3f}s, start_s={start_s:.3f}s, video_s={duration_s:.3f}s")
            if start_s < total_v - 1e-6:
                rem = start_s
                idx = 0
                while idx < len(bg_loaded) and rem >= v_durs[idx] - 1e-6:
                    rem -= v_durs[idx]
                    idx += 1
                parts: List[VideoFileClip] = []
                if idx < len(bg_loaded):
                    first = bg_loaded[idx].subclip(rem)
                    parts.append(first)
                    for j in range(idx + 1, len(bg_loaded)):
                        parts.append(bg_loaded[j])
                    bg = concatenate_videoclips(parts)
                    if bg.duration > duration_s + 1e-6:
                        bg = bg.subclip(0, duration_s)
                    # Les vidéos sont déjà à la bonne taille/fps
                    bg_clip = bg
                    print(f"[video] fond attaché: {bg_clip.duration:.3f}s")
                else:
                    print("[video] start_time dépasse la durée totale des vidéos -> pas de fond")
            else:
                print("[video] start_time >= total_video -> pas de fond")
        except Exception as e:
            print("[video][ERREUR]", repr(e))
            bg_clip = None

    # Composer le résultat final
    if bg_clip is not None:
        final_clip = CompositeVideoClip([bg_clip, overlay_clip], size=target_size)
        final_clip = final_clip.set_duration(duration_s)
    else:
        final_clip = overlay_clip

    print("[moviepy] Clip prêt.")

    # Construction de l'audio (concat, skip start_time, clamp à la durée vidéo)
    audio_clip: Optional[AudioFileClip] = None
    loaded_audio_clips: List[AudioFileClip] = []
    if audios:
        try:
            start_s = max(0.0, start_time / 1000.0)
            loaded_audio_clips = [AudioFileClip(p) for p in audios]
            durations = [c.duration for c in loaded_audio_clips]
            total_audio = float(sum(durations))
            print(f"[audio] total_audio={total_audio:.3f}s, start_s={start_s:.3f}s, video_s={duration_s:.3f}s")
            if start_s < total_audio - 1e-6:
                rem = start_s
                idx = 0
                while idx < len(loaded_audio_clips) and rem >= durations[idx] - 1e-6:
                    rem -= durations[idx]
                    idx += 1
                parts_a: List[AudioFileClip] = []
                if idx < len(loaded_audio_clips):
                    first = loaded_audio_clips[idx].subclip(rem)
                    parts_a.append(first)
                    for j in range(idx + 1, len(loaded_audio_clips)):
                        parts_a.append(loaded_audio_clips[j])
                    cat = concatenate_audioclips(parts_a)
                    if cat.duration > duration_s + 1e-6:
                        cat = cat.subclip(0, duration_s)
                    audio_clip = cat
                    final_clip = final_clip.set_audio(audio_clip)
                    print(f"[audio] piste attachée: {audio_clip.duration:.3f}s")
                else:
                    print("[audio] start_time dépasse la durée totale des audios -> pas d'audio")
            else:
                print("[audio] start_time >= total_audio -> pas d'audio")
        except Exception as e:
            print("[audio][ERREUR]", repr(e))
            audio_clip = None

    # Sortie
    out_path = Path(final_file_path)
    if out_path.parent:
        print(f"[fs] Création du dossier de sortie si besoin: {out_path.parent}")
        os.makedirs(out_path.parent, exist_ok=True)

    logger = VeryVerboseFFmpegLogger()
    print("[logger] Logger ffmpeg initialisé.")

    # Choix du codec
    codec, extra_params, extra_kwargs = _choose_best_codec(prefer_hw=prefer_hw)
    print(f"[encode] Codec choisi: {codec}")

    # Ecriture vidéo dans un thread (pour ne pas bloquer l'async)
    def _write():
        print("[encode] Démarrage encodage...")
        t_enc = time.time()
        ffmpeg_params = list(extra_params)
        kwargs = dict(
            codec=codec,
            fps=fps,
            audio=bool(audio_clip),
            verbose=True,
            logger=logger,
            threads=os.cpu_count() or 0,
            ffmpeg_params=ffmpeg_params,
        )
        if audio_clip is not None:
            kwargs["audio_codec"] = "aac"
            kwargs["audio_bitrate"] = "192k"
        if extra_kwargs.get("preset") is not None:
            kwargs["preset"] = extra_kwargs["preset"]
        final_clip.write_videofile(str(out_path), **kwargs)
        print(f"[encode] Terminé en {time.time()-t_enc:.2f}s -> {out_path}")

    print("[async] Lancement de l'encodage dans un thread...")
    await asyncio.to_thread(_write)

    # Fermeture des ressources audio/vidéo
    try:
        try:
            overlay_clip.close()
        except Exception:
            pass
        try:
            if bg_clip is not None:
                bg_clip.close()
        except Exception:
            pass
        try:
            if audio_clip is not None:
                audio_clip.close()
        except Exception:
            pass
        for c in bg_loaded:
            try:
                c.close()
            except Exception:
                pass
        for c in loaded_audio_clips:
            try:
                c.close()
            except Exception:
                pass
        try:
            if 'final_clip' in locals() and final_clip is not None:
                final_clip.close()
        except Exception:
            pass
    except Exception:
        pass

    # Calcul et exposition de la durée d'export
    export_time_s = time.time() - t0
    global LAST_EXPORT_TIME_S
    LAST_EXPORT_TIME_S = export_time_s
    print(f"[done] Export terminé en {export_time_s:.2f}s")
    print(f"[metric] export_time_seconds={export_time_s:.3f}")

    return str(out_path)


# --- Exécution directe ---
if __name__ == "__main__":
    async def main():
        img_folder = r"C:\Users\zonedetec\AppData\Roaming\com.qurancaption\exports\1756319549551230"
        fade_duration = 500
        fps = 30
        final_file_path = "./output.mp4"
        audios=[r"F:\Annexe\Montage vidéo\quran.al.luhaidan\196\تلاوة أحمد ديبان رواية ورش عام 1443 سورة 003  آل عمران.mp3"]
        videos=[r"F:\Annexe\Montage vidéo\quran.al.luhaidan\199\video_4027.mp4"]
        start_time = 0
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