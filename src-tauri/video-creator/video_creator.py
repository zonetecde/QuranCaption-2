#!/usr/bin/env python3
"""
Fixed Video Creator - Version 2.4
Fixes portrait mode dimension calculation and frame scaling
"""

# URGENT DEBUG: Très tôt dans le script
print("=== PYTHON SCRIPT STARTING ===", flush=True)
import sys
print(f"Python version: {sys.version}", flush=True)
print(f"Platform: {sys.platform}", flush=True)
print(f"Encoding - stdin: {sys.stdin.encoding}, stdout: {sys.stdout.encoding}, stderr: {sys.stderr.encoding}", flush=True)

import argparse
import shutil
import cv2
import numpy as np
import os
import platform
import time
import re
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, Tuple, List, Union, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache

# Plus de debugging des variables d'environnement
print(f"PYTHONIOENCODING: {os.environ.get('PYTHONIOENCODING', 'Not set')}", flush=True)
print(f"LC_ALL: {os.environ.get('LC_ALL', 'Not set')}", flush=True)
print(f"LANG: {os.environ.get('LANG', 'Not set')}", flush=True)
import threading

# MoviePy imports
from moviepy.editor import AudioFileClip, VideoClip, VideoFileClip, ImageClip
from moviepy.config import change_settings
from proglog import ProgressBarLogger

# Configuration constants
MAX_CACHE_SIZE = 100
FRAME_CACHE_SIZE = 50
DEFAULT_FPS = 30
DEFAULT_THREADS = min(8, os.cpu_count() or 4)

@dataclass
class BackgroundTransform:
    """Background transformation parameters"""
    translate_x: int = 0
    translate_y: int = 0
    scale: float = 1.0

@dataclass
class FrameData:
    """Data for a single frame/image"""
    start_ms: int
    end_ms: int
    top_section: Optional[np.ndarray] = None
    middle_section: Optional[np.ndarray] = None
    bottom_section: Optional[np.ndarray] = None
    top_alpha: Optional[np.ndarray] = None
    middle_alpha: Optional[np.ndarray] = None
    bottom_alpha: Optional[np.ndarray] = None

@dataclass
class VideoConfig:
    """Video generation configuration"""
    folder_path: str
    audio_path: str
    output_path: str
    transition_ms: int
    start_time_ms: int
    end_time_ms: int
    top_ratio: float
    bottom_ratio: float
    dynamic_top: bool
    background_path: str
    background_transform: BackgroundTransform
    audio_fade_start: int
    audio_fade_end: int
    force_portrait: int  # Nouveau paramètre
    fps: int = DEFAULT_FPS
    threads: int = DEFAULT_THREADS

def ensure_even_dimensions(width: int, height: int) -> Tuple[int, int]:
    """Ensure dimensions are even numbers for H.264 compatibility"""
    width = width - (width % 2)
    height = height - (height % 2)
    return width, height

class OptimizedProgressLogger(ProgressBarLogger):
    """Optimized progress logger with better status tracking"""
    
    def __init__(self):
        super().__init__()
        self.last_percent = 0
        self.phase_count = 0
        self.has_audio = True
        self.status_messages = [
            "Initializing...",
            "Processing audio...",
            "Rendering video...",
            "Finalizing..."
        ]
    
    def set_audio_status(self, has_audio: bool):
        self.has_audio = has_audio
        if not has_audio:
            self.status_messages[1] = "Rendering video..."
    
    def bars_callback(self, bar, attr, value, old_value=None):
        if not hasattr(self, 'bars') or bar not in self.bars:
            return
            
        try:
            percentage = round((value / self.bars[bar]['total']) * 100)
            
            if percentage != self.last_percent:
                status = self.status_messages[min(self.phase_count, len(self.status_messages) - 1)]
                print(f"percentage: {percentage}% | status: {status}", flush=True)
                self.last_percent = percentage
                
                if percentage == 100:
                    self.phase_count += 1
        except (ZeroDivisionError, KeyError):
            pass

class ImageCache:
    """Thread-safe LRU cache for images"""
    
    def __init__(self, max_size: int = MAX_CACHE_SIZE):
        self.max_size = max_size
        self.cache: Dict[str, Tuple[np.ndarray, Optional[np.ndarray]]] = {}
        self.access_order: List[str] = []
        self.lock = threading.RLock()
    
    def get(self, key: str) -> Optional[Tuple[np.ndarray, Optional[np.ndarray]]]:
        with self.lock:
            if key in self.cache:
                self.access_order.remove(key)
                self.access_order.append(key)
                return self.cache[key]
            return None
    
    def put(self, key: str, value: Tuple[np.ndarray, Optional[np.ndarray]]):
        with self.lock:
            if key in self.cache:
                self.access_order.remove(key)
            elif len(self.cache) >= self.max_size:
                oldest_key = self.access_order.pop(0)
                del self.cache[oldest_key]
            
            self.cache[key] = value
            self.access_order.append(key)
    
    def clear(self):
        with self.lock:
            self.cache.clear()
            self.access_order.clear()

class BackgroundProcessor:
    """Handles background video/image processing with caching"""
    
    def __init__(self, background_path: str, dimensions: Tuple[int, int], 
                 transform: BackgroundTransform, duration_sec: float,
                 start_ms: int, end_ms: int):
        self.background_path = background_path
        self.dimensions = dimensions
        self.transform = transform
        self.duration_sec = duration_sec
        self.start_ms = start_ms
        self.end_ms = end_ms
        
        self.is_video = False
        self.is_image = False
        self.background_data = None
        self.video_clip = None
        
        # Cache for transformed frames
        self.frame_cache = {}
        self.cache_lock = threading.RLock()
        
        self._load_background()
    
    def _load_background(self):
        """Load background image or video"""
        if not self.background_path or not os.path.exists(self.background_path):
            return
        
        height, width = self.dimensions
        file_ext = Path(self.background_path).suffix.lower()
        
        image_exts = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp'}
        video_exts = {'.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v'}
        
        try:
            if file_ext in image_exts:
                self._load_background_image(width, height)
            elif file_ext in video_exts:
                self._load_background_video()
        except Exception as e:
            print(f"Warning: Could not load background: {e}", flush=True)
    
    def _load_background_image(self, width: int, height: int):
        """Load and prepare background image"""
        try:
            with open(self.background_path, 'rb') as f:
                file_data = np.frombuffer(f.read(), dtype=np.uint8)
            
            img = cv2.imdecode(file_data, cv2.IMREAD_COLOR)
            if img is None:
                return
            
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_resized = cv2.resize(img_rgb, (width, height), interpolation=cv2.INTER_LANCZOS4)
            
            self.background_data = img_resized
            self.is_image = True
            print(f"Background image loaded: {img_resized.shape}", flush=True)
            
        except Exception as e:
            print(f"Error loading background image: {e}", flush=True)
    
    def _load_background_video(self):
        """Load background video"""
        try:
            height, width = self.dimensions
            self.video_clip = VideoFileClip(self.background_path)
            
            # Étape 1: Redimensionner pour couvrir complètement la zone (sans crop encore)
            original_width, original_height = self.video_clip.size
            original_aspect = original_width / original_height
            target_aspect = width / height
            
            if original_aspect > target_aspect:
                # La vidéo est plus large, on redimensionne par la hauteur
                new_height = height
                new_width = int(height * original_aspect)
            else:
                # La vidéo est plus haute, on redimensionne par la largeur
                new_width = width
                new_height = int(width / original_aspect)
            
            # Redimensionner en gardant l'aspect ratio
            self.video_clip = self.video_clip.resize((new_width, new_height))
            
            # Étape 2: Les transformations seront appliquées dans _transform_frame
            # On ne fait PAS le crop ici, car les transformations peuvent changer la position
            
            # Calculate trim times
            trim_start = self.start_ms / 1000.0
            trim_end = (self.end_ms if self.end_ms > 0 else self.start_ms + self.duration_sec * 1000) / 1000.0
            trim_end = min(trim_end, self.video_clip.duration)
            
            # Trim video if needed
            if trim_start > 0 or trim_end < self.video_clip.duration:
                if trim_start < self.video_clip.duration:
                    self.video_clip = self.video_clip.subclip(trim_start, trim_end)
                else:
                    print(f"Warning: Start time {trim_start}s exceeds video duration {self.video_clip.duration}s", flush=True)
                    return
            
            # Loop video if it's shorter than needed
            if self.video_clip.duration < self.duration_sec:
                self.video_clip = self.video_clip.loop(duration=self.duration_sec)
            
            self.is_video = True
            print(f"Background video loaded: {self.video_clip.duration:.2f}s, size: {self.video_clip.size}", flush=True)
            
        except Exception as e:
            print(f"Error loading background video: {e}", flush=True)
    
    def get_frame(self, t_seconds: float) -> Optional[np.ndarray]:
        """Get background frame at given time"""
        if not (self.is_image or self.is_video):
            return None
        
        try:
            if self.is_image:
                frame = self.background_data.copy()
            else:
                t_clamped = max(0, min(t_seconds, self.video_clip.duration - 0.001))
                frame = self.video_clip.get_frame(t_clamped)
            return self._transform_frame(frame)
            
        except Exception as e:
            print(f"Warning: Error getting background frame at {t_seconds}s: {e}", flush=True)
            return self.background_data.copy() if self.is_image else None
    
    def _transform_frame(self, frame: np.ndarray) -> np.ndarray:
        """Apply transformations to frame with caching - mimics CSS: scale() translateX() translateY()"""
        if frame is None:
            return None
            
        height, width = self.dimensions
        transform_key = f"{self.transform.translate_x}_{self.transform.translate_y}_{self.transform.scale}"
        
        with self.cache_lock:
            if transform_key in self.frame_cache and self.is_image:
                return self.frame_cache[transform_key]
        
        try:
            # Étape 1: Appliquer le scale depuis le centre (comme CSS scale())
            if self.transform.scale != 1.0:
                orig_h, orig_w = frame.shape[:2]
                new_w = int(orig_w * self.transform.scale)
                new_h = int(orig_h * self.transform.scale)
                frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
            
            src_h, src_w = frame.shape[:2]
            
            # Étape 2: Créer le résultat final avec les bonnes dimensions
            result = np.zeros((height, width, 3), dtype=np.uint8)
            
            # Étape 3: Calculer la position après translation
            # Position du coin supérieur gauche de la frame dans le résultat
            # Par défaut, on centre la frame
            start_x = (width - src_w) // 2
            start_y = (height - src_h) // 2
            
            # Appliquer les translations en pixels (comme CSS translateX/translateY)
            start_x += self.transform.translate_x
            start_y += self.transform.translate_y
            
            # Étape 4: Calculer les régions de copie valides
            # Source (dans la frame)
            src_x_start = max(0, -start_x)
            src_y_start = max(0, -start_y)
            src_x_end = min(src_w, width - start_x)
            src_y_end = min(src_h, height - start_y)
            
            # Destination (dans le résultat)
            dst_x_start = max(0, start_x)
            dst_y_start = max(0, start_y)
            dst_x_end = dst_x_start + (src_x_end - src_x_start)
            dst_y_end = dst_y_start + (src_y_end - src_y_start)
            
            # Copier seulement si les régions sont valides
            if (src_x_end > src_x_start and src_y_end > src_y_start and
                dst_x_end > dst_x_start and dst_y_end > dst_y_start and
                dst_x_end <= width and dst_y_end <= height):
                
                result[dst_y_start:dst_y_end, dst_x_start:dst_x_end] = \
                    frame[src_y_start:src_y_end, src_x_start:src_x_end]
            
            # Cache le résultat pour les images statiques
            with self.cache_lock:
                if self.is_image and len(self.frame_cache) < 10:
                    self.frame_cache[transform_key] = result.copy()
            
            return result
            
        except Exception as e:
            print(f"Error transforming frame: {e}", flush=True)
            return frame if frame is not None else np.zeros((height, width, 3), dtype=np.uint8)

class OptimizedVideoCreator:
    """Main video creator class with optimized processing"""
    
    def __init__(self, config: VideoConfig):
        self.config = config
        self.image_cache = ImageCache()
        self.frames_data: List[FrameData] = []
        self.static_sections = {}
        self.dimensions = (0, 0)
        self.output_dimensions = (0, 0)  # Nouvelles dimensions pour le format final
        
        # CORRECTION PRINCIPALE : Variables pour la couleur de transition
        self.background_color = None  # Couleur RGB du pixel [10,10]
        self.background_alpha = None  # Alpha du pixel [10,10]
        
        self.background_processor: Optional[BackgroundProcessor] = None
        self.logger = OptimizedProgressLogger()
        
        self.middle_ratio = 1.0 - config.top_ratio - config.bottom_ratio
        self._setup_ffmpeg()
    
    def _setup_ffmpeg(self):
        """Configure FFmpeg path"""
        try:
            app_dir = Path(sys.executable).parent if getattr(sys, 'frozen', False) else Path(__file__).parent
            
            ffmpeg_name = 'ffmpeg.exe' if platform.system() == 'Windows' else 'ffmpeg'
            local_ffmpeg = app_dir / ffmpeg_name
            
            if local_ffmpeg.exists():
                change_settings({"FFMPEG_BINARY": str(local_ffmpeg)}, flush=True)
                print(f"Using bundled FFmpeg: {local_ffmpeg}", flush=True)
            else:
                print("Using system FFmpeg", flush=True)
        except Exception as e:
            print(f"Warning: FFmpeg setup failed: {e}", flush=True)
    
    def load_image_optimized(self, image_path: str, preserve_alpha: bool = True) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """Optimized image loading with caching"""
        cache_key = f"{image_path}_{preserve_alpha}"
        cached = self.image_cache.get(cache_key)
        if cached:
            return cached
        
        try:
            with open(image_path, 'rb') as f:
                file_data = np.frombuffer(f.read(), dtype=np.uint8)
            
            if preserve_alpha:
                img = cv2.imdecode(file_data, cv2.IMREAD_UNCHANGED)
                if img is None:
                    return None, None
                
                if len(img.shape) == 3 and img.shape[2] == 4:
                    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGRA2RGBA)
                    rgb = img_rgb[:, :, :3]
                    alpha = img_rgb[:, :, 3] / 255.0
                else:
                    if len(img.shape) == 3:
                        rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    else:
                        rgb = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
                    alpha = np.ones((rgb.shape[0], rgb.shape[1]), dtype=np.float32)
            else:
                img = cv2.imdecode(file_data, cv2.IMREAD_COLOR)
                if img is None:
                    return None, None
                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                alpha = None
            
            result = (rgb, alpha)
            self.image_cache.put(cache_key, result)
            return result
            
        except Exception as e:
            print(f"Error loading image {image_path}: {e}", flush=True)
            return None, None
    
    def process_images(self) -> bool:
        """Process all images and prepare frame data"""
        folder = Path(self.config.folder_path)
        if not folder.exists():
            raise ValueError(f"Folder not found: {folder}")
        
        image_files = sorted([f for f in folder.glob('*.png')], 
                           key=lambda x: int(re.match(r'(\d+)_\d+\.png', x.name).group(1)))
        
        if not image_files:
            raise ValueError("No PNG files found")
        
        print(f"Processing {len(image_files)} images...", flush=True)
        
        # Load first image for dimensions and background color
        first_img_rgb, first_img_alpha = self.load_image_optimized(
            str(image_files[0]), preserve_alpha=bool(self.config.background_path))
        
        if first_img_rgb is None:
            raise ValueError(f"Could not load first image: {image_files[0]}")
        
        # CORRECTION 1: Calcul correct des dimensions selon le mode portrait ou paysage
        orig_height, orig_width = first_img_rgb.shape[:2]
        
        if self.config.force_portrait == 1:
            # Mode portrait TikTok : CORRIGER l'inversion
            # Les frames originales sont en paysage (ex: 1920x1080)
            # La vidéo finale doit être en portrait (ex: 1080x1920)
            output_height = orig_width  # 1920 (hauteur finale = largeur originale)
            output_width = orig_height  # 1080 (largeur finale = hauteur originale)
            
            # Les frames gardent leurs dimensions originales (paysage) pour le traitement
            frame_width, frame_height = ensure_even_dimensions(orig_width, orig_height)
            
            # Dimensions finales de la vidéo (portrait) - CORRECTION : ordre correct (height, width)
            self.output_dimensions = ensure_even_dimensions(output_height, output_width)
            # self.output_dimensions = (self.output_dimensions[1], self.output_dimensions[0])  # Inverser pour (height, width)
            
            print(f"Portrait mode enabled:", flush=True)
            print(f"  - Original frame size: {orig_width}x{orig_height}", flush=True)
            print(f"  - Frame dimensions (landscape): {frame_width}x{frame_height}", flush=True)
            print(f"  - Output dimensions (portrait): {self.output_dimensions[1]}x{self.output_dimensions[0]} (WxH)", flush=True)
        else:
            # Mode paysage normal
            frame_width, frame_height = ensure_even_dimensions(orig_width, orig_height)
            self.output_dimensions = (frame_height, frame_width)
            
            print(f"Landscape mode: {frame_width}x{frame_height}", flush=True)
        
        # Redimensionner la première image si nécessaire pour les frames
        if (frame_width, frame_height) != (orig_width, orig_height):
            first_img_rgb = cv2.resize(first_img_rgb, (frame_width, frame_height), interpolation=cv2.INTER_LANCZOS4)
            if first_img_alpha is not None:
                first_img_alpha = cv2.resize(first_img_alpha, (frame_width, frame_height), interpolation=cv2.INTER_LANCZOS4)
        
        # Dimensions pour le traitement des frames (toujours en paysage)
        self.dimensions = (frame_height, frame_width)
        
        # CORRECTION : Extraction correcte de la couleur de fond depuis le pixel [10,10]
        if frame_height > 10 and frame_width > 10:
            self.background_color = first_img_rgb[10, 10].copy()  # RGB
            if self.config.background_path and first_img_alpha is not None:
                self.background_alpha = first_img_alpha[10, 10]  # Alpha
            else:
                self.background_alpha = 1.0  # Opaque par défaut
            
            print(f"Background color for transitions: RGB{tuple(self.background_color)} Alpha:{self.background_alpha:.3f}", flush=True)
        else:
            # Fallback si l'image est trop petite
            self.background_color = np.array([0, 0, 0], dtype=np.uint8)  # Noir
            self.background_alpha = 1.0
            print("Using black as default background color for transitions", flush=True)
        
        # Calculate section heights (basé sur les dimensions des frames)
        top_height = int(frame_height * self.config.top_ratio)
        bottom_height = int(frame_height * self.config.bottom_ratio)
        middle_height = frame_height - top_height - bottom_height
        
        # Process static sections
        if bottom_height > 0:
            self.static_sections['bottom'] = (
                first_img_rgb[-bottom_height:],
                first_img_alpha[-bottom_height:] if first_img_alpha is not None else None
            )
        
        if not self.config.dynamic_top and top_height > 0:
            self.static_sections['top'] = (
                first_img_rgb[:top_height],
                first_img_alpha[:top_height] if first_img_alpha is not None else None
            )
        
        # Process all images with threading
        with ThreadPoolExecutor(max_workers=min(self.config.threads, len(image_files))) as executor:
            futures = {executor.submit(self._process_single_image, img_file, 
                                     top_height, middle_height, bottom_height, frame_width, frame_height): img_file 
                      for img_file in image_files}
            
            for future in as_completed(futures):
                try:
                    frame_data = future.result()
                    if frame_data:
                        self.frames_data.append(frame_data)
                except Exception as e:
                    print(f"Error processing image: {e}", flush=True)
        
        # Sort by start time
        self.frames_data.sort(key=lambda x: x.start_ms)
        print(f"Processed {len(self.frames_data)} frames", flush=True)
        return len(self.frames_data) > 0
    
    def _process_single_image(self, img_file: Path, top_height: int, 
                            middle_height: int, bottom_height: int,
                            target_width: int, target_height: int) -> Optional[FrameData]:
        """Process a single image file"""
        try:
            match = re.match(r'(\d+)_(\d+)\.png', img_file.name)
            if not match:
                return None
            
            start_ms = int(match.group(1))
            end_ms = int(match.group(2))
            
            img_rgb, img_alpha = self.load_image_optimized(
                str(img_file), preserve_alpha=bool(self.config.background_path))
            
            if img_rgb is None:
                return None
            
            # Resize to target dimensions if needed
            if img_rgb.shape[:2] != (target_height, target_width):
                img_rgb = cv2.resize(img_rgb, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)
                if img_alpha is not None:
                    img_alpha = cv2.resize(img_alpha, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)
            
            frame_data = FrameData(start_ms=start_ms, end_ms=end_ms)
            
            # Extract sections
            if top_height > 0 and self.config.dynamic_top:
                frame_data.top_section = img_rgb[:top_height].copy()
                frame_data.top_alpha = img_alpha[:top_height].copy() if img_alpha is not None else None
            
            if middle_height > 0:
                frame_data.middle_section = img_rgb[top_height:top_height + middle_height].copy()
                frame_data.middle_alpha = img_alpha[top_height:top_height + middle_height].copy() if img_alpha is not None else None
            
            return frame_data
            
        except Exception as e:
            print(f"Error processing {img_file}: {e}", flush=True)
            return None
    
    def setup_background(self, duration_sec: float, start_ms: int, end_ms: int):
        """Setup background processor"""
        if self.config.background_path and self.config.background_path.strip():
            # Pour le background, on utilise toujours les dimensions de sortie
            bg_dimensions = self.output_dimensions if self.config.force_portrait == 1 else self.dimensions
            self.background_processor = BackgroundProcessor(
                self.config.background_path,
                bg_dimensions,
                self.config.background_transform,
                duration_sec,
                start_ms,
                end_ms
            )
    
    def blend_alpha_optimized(self, foreground: np.ndarray, background: np.ndarray, 
                            alpha: np.ndarray, position: Optional[Tuple[int, int]] = None) -> np.ndarray:
        """Optimized alpha blending"""
        try:
            if position is None:
                if foreground.shape[:2] != background.shape[:2]:
                    return background
                
                alpha_3ch = np.stack([alpha, alpha, alpha], axis=2)
                inv_alpha = 1.0 - alpha_3ch
                
                return (foreground * alpha_3ch + background * inv_alpha).astype(np.uint8)
            else:
                result = background.copy()
                y, x = position
                fg_h, fg_w = foreground.shape[:2]
                bg_h, bg_w = background.shape[:2]
                
                # Calculate valid regions
                fg_y_start = max(0, -y)
                fg_x_start = max(0, -x)
                fg_y_end = min(fg_h, bg_h - y)
                fg_x_end = min(fg_w, bg_w - x)
                
                bg_y_start = max(0, y)
                bg_x_start = max(0, x)
                bg_y_end = bg_y_start + (fg_y_end - fg_y_start)
                bg_x_end = bg_x_start + (fg_x_end - fg_x_start)
                
                if (fg_y_end > fg_y_start and fg_x_end > fg_x_start and
                    bg_y_end > bg_y_start and bg_x_end > bg_x_start):
                    
                    fg_region = foreground[fg_y_start:fg_y_end, fg_x_start:fg_x_end]
                    bg_region = result[bg_y_start:bg_y_end, bg_x_start:bg_x_end]
                    alpha_region = alpha[fg_y_start:fg_y_end, fg_x_start:fg_x_end]
                    
                    alpha_3ch = np.stack([alpha_region, alpha_region, alpha_region], axis=2)
                    inv_alpha = 1.0 - alpha_3ch
                    
                    result[bg_y_start:bg_y_end, bg_x_start:bg_x_end] = \
                        (fg_region * alpha_3ch + bg_region * inv_alpha).astype(np.uint8)
                
                return result
        except Exception as e:
            print(f"Error in alpha blending: {e}", flush=True)
            return background
    
    def make_frame_optimized(self, t_seconds: float) -> np.ndarray:
        """Optimized frame generation with portrait support"""
        try:
            t_ms = int(t_seconds * 1000) + self.config.start_time_ms
            
            # Find current frame data
            current_frame = None
            next_frame = None
            
            for i, frame_data in enumerate(self.frames_data):
                if frame_data.start_ms <= t_ms < frame_data.end_ms:
                    current_frame = frame_data
                    if i + 1 < len(self.frames_data):
                        next_frame = self.frames_data[i + 1]
                    break
            
            if current_frame is None:
                if t_ms >= self.frames_data[-1].end_ms:
                    current_frame = self.frames_data[-1]
                else:
                    current_frame = self.frames_data[0]
            
            if self.config.force_portrait == 1:
                return self._make_portrait_frame(t_seconds, current_frame, next_frame, t_ms)
            else:
                return self._make_landscape_frame(t_seconds, current_frame, next_frame, t_ms)
                
        except Exception as e:
            print(f"Error generating frame at {t_seconds}s: {e}", flush=True)
            output_height, output_width = self.output_dimensions
            return np.zeros((output_height, output_width, 3), dtype=np.uint8)
    
    def _make_landscape_frame(self, t_seconds: float, current_frame: FrameData, 
                            next_frame: Optional[FrameData], t_ms: int) -> np.ndarray:
        """Generate landscape frame (original behavior)"""
        height, width = self.dimensions
        
        # Get background frame
        bg_frame = None
        if self.background_processor:
            bg_frame = self.background_processor.get_frame(t_seconds)
        
        # Create base frame
        if bg_frame is not None:
            frame = bg_frame.copy()
        else:
            frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Determine if using alpha blending
        use_alpha = bg_frame is not None and (
            any(section[1] is not None for section in self.static_sections.values()) or
            (current_frame and any([
                current_frame.top_alpha is not None,
                current_frame.middle_alpha is not None
            ]))
        )
        
        # Calculate transition
        in_transition = False
        transition_progress = 0.0
        
        if (next_frame and self.config.transition_ms > 0 and
            next_frame.start_ms - self.config.transition_ms <= t_ms < next_frame.start_ms):
            in_transition = True
            transition_progress = (t_ms - (next_frame.start_ms - self.config.transition_ms)) / self.config.transition_ms
            transition_progress = max(0.0, min(1.0, transition_progress))
        
        # Add sections
        y_offset = 0
        
        # Top section
        if 'top' in self.static_sections:
            top_section, top_alpha = self.static_sections['top']
            if use_alpha and top_alpha is not None:
                frame = self.blend_alpha_optimized(top_section, frame, top_alpha, (y_offset, 0))
            else:
                frame[y_offset:y_offset + top_section.shape[0]] = top_section
            y_offset += top_section.shape[0]
        elif current_frame and current_frame.top_section is not None:
            if use_alpha and current_frame.top_alpha is not None:
                frame = self.blend_alpha_optimized(current_frame.top_section, frame, 
                                                 current_frame.top_alpha, (y_offset, 0))
            else:
                frame[y_offset:y_offset + current_frame.top_section.shape[0]] = current_frame.top_section
            y_offset += current_frame.top_section.shape[0]
        
        # Middle section with transition
        if current_frame and current_frame.middle_section is not None:
            middle_section = current_frame.middle_section
            middle_alpha = current_frame.middle_alpha
            
            if in_transition and next_frame and next_frame.middle_section is not None:
                middle_section = self._apply_transition_with_background_color(
                    middle_section, next_frame.middle_section, transition_progress,
                    middle_alpha, next_frame.middle_alpha, use_alpha
                )
                middle_alpha = self._interpolate_alpha(middle_alpha, next_frame.middle_alpha, transition_progress)
            
            if use_alpha and middle_alpha is not None:
                frame = self.blend_alpha_optimized(middle_section, frame, middle_alpha, (y_offset, 0))
            else:
                frame[y_offset:y_offset + middle_section.shape[0]] = middle_section
            y_offset += middle_section.shape[0]
        
        # Bottom section
        if 'bottom' in self.static_sections:
            bottom_section, bottom_alpha = self.static_sections['bottom']
            if use_alpha and bottom_alpha is not None:
                frame = self.blend_alpha_optimized(bottom_section, frame, bottom_alpha, 
                                                 (height - bottom_section.shape[0], 0))
            else:
                frame[height - bottom_section.shape[0]:] = bottom_section
        
        return frame
    
    def _make_portrait_frame(self, t_seconds: float, current_frame: FrameData, 
                           next_frame: Optional[FrameData], t_ms: int) -> np.ndarray:
        """CORRECTION 2: Generate portrait frame with proper scaling to fit entirely"""
        # Générer d'abord la frame paysage
        landscape_frame = self._make_landscape_frame(t_seconds, current_frame, next_frame, t_ms)
        
        # Dimensions de sortie (portrait)
        output_height, output_width = self.output_dimensions
        landscape_height, landscape_width = landscape_frame.shape[:2]
        
        # Créer le frame portrait avec fond noir
        portrait_frame = np.zeros((output_height, output_width, 3), dtype=np.uint8)
        
        # CORRECTION 2: Calculer le scale pour que la frame paysage rentre ENTIÈREMENT dans le portrait
        # On veut que toute la frame soit visible, donc on prend le ratio le plus contraignant
        scale_x = output_width / landscape_width   # Combien on peut mettre en largeur
        scale_y = output_height / landscape_height  # Combien on peut mettre en hauteur
        scale = min(scale_x, scale_y)  # Prendre le plus petit pour que tout rentre
        
        # Calculer les nouvelles dimensions de la frame après scale
        new_width = int(landscape_width * scale)
        new_height = int(landscape_height * scale)
        
        # S'assurer que les dimensions sont paires pour H.264
        new_width, new_height = ensure_even_dimensions(new_width, new_height)
        
        # Redimensionner la frame paysage
        if scale != 1.0:
            scaled_frame = cv2.resize(landscape_frame, (new_width, new_height), interpolation=cv2.INTER_LANCZOS4)
        else:
            scaled_frame = landscape_frame
        
        # Calculer la position pour centrer la frame redimensionnée
        y_offset = (output_height - new_height) // 2
        x_offset = (output_width - new_width) // 2
        
        # S'assurer que les offsets sont valides
        y_start = max(0, y_offset)
        y_end = min(output_height, y_offset + new_height)
        x_start = max(0, x_offset) 
        x_end = min(output_width, x_offset + new_width)
        
        # Calculer les régions source correspondantes
        src_y_start = max(0, -y_offset)
        src_y_end = src_y_start + (y_end - y_start)
        src_x_start = max(0, -x_offset)
        src_x_end = src_x_start + (x_end - x_start)
        
        # Copier la frame redimensionnée au centre du frame portrait
        if (y_end > y_start and x_end > x_start and 
            src_y_end <= new_height and src_x_end <= new_width):
            portrait_frame[y_start:y_end, x_start:x_end] = \
                scaled_frame[src_y_start:src_y_end, src_x_start:src_x_end]
        
        return portrait_frame
    
    def _apply_transition_with_background_color(self, current: np.ndarray, next_img: np.ndarray, 
                                              progress: float, current_alpha: Optional[np.ndarray], 
                                              next_alpha: Optional[np.ndarray], use_alpha: bool) -> np.ndarray:
        """
        CORRECTION PRINCIPALE : Apply transition using the stored background color from pixel [10,10]
        au lieu de transparent ou noir
        """
        try:
            if use_alpha and current_alpha is not None and self.background_color is not None:
                # Avec alpha : fade via la couleur de fond extraite
                if progress < 0.5:
                    # Première moitié : fondu de l'image actuelle vers la couleur de fond
                    alpha_factor = 1.0 - progress * 2
                    bg_frame = np.full_like(current, self.background_color)
                    bg_alpha = np.full_like(current_alpha, self.background_alpha)
                    
                    # Mélange de l'image actuelle avec la couleur de fond
                    intermediate = cv2.addWeighted(current, alpha_factor, bg_frame, 1 - alpha_factor, 0)
                    return intermediate
                else:
                    # Deuxième moitié : fondu de la couleur de fond vers la prochaine image
                    alpha_factor = (progress - 0.5) * 2
                    bg_frame = np.full_like(next_img, self.background_color)
                    
                    # Mélange de la couleur de fond avec la prochaine image
                    intermediate = cv2.addWeighted(bg_frame, 1 - alpha_factor, next_img, alpha_factor, 0)
                    return intermediate
            else:
                # Sans alpha : fondu RGB direct vers la couleur de fond
                if progress < 0.5:
                    alpha_factor = 1.0 - progress * 2
                    if self.background_color is not None:
                        bg_frame = np.full_like(current, self.background_color)
                    else:
                        bg_frame = np.zeros_like(current)  # Fallback noir
                    return cv2.addWeighted(current, alpha_factor, bg_frame, 1 - alpha_factor, 0)
                else:
                    alpha_factor = (progress - 0.5) * 2
                    if self.background_color is not None:
                        bg_frame = np.full_like(next_img, self.background_color)
                    else:
                        bg_frame = np.zeros_like(next_img)  # Fallback noir
                    return cv2.addWeighted(bg_frame, 1 - alpha_factor, next_img, alpha_factor, 0)
                    
        except Exception as e:
            print(f"Error in transition: {e}", flush=True)
            return current if progress < 0.5 else next_img
    
    def _interpolate_alpha(self, alpha1: Optional[np.ndarray], alpha2: Optional[np.ndarray], 
                          progress: float) -> Optional[np.ndarray]:
        """Interpolate alpha channels during transition"""
        try:
            if alpha1 is None and alpha2 is None:
                return None
            if alpha1 is None:
                return alpha2 * progress
            if alpha2 is None:
                return alpha1 * (1 - progress)
            
            if progress < 0.5:
                # Fondu vers alpha de fond (self.background_alpha)
                transition_alpha = alpha1 * (1.0 - progress * 2) + self.background_alpha * (progress * 2)
                return transition_alpha
            else:
                # Fondu de alpha de fond vers alpha2
                transition_alpha = self.background_alpha * (1.0 - (progress - 0.5) * 2) + alpha2 * ((progress - 0.5) * 2)
                return transition_alpha
        except Exception as e:
            print(f"Error interpolating alpha: {e}", flush=True)
            return alpha1 if alpha1 is not None else alpha2
    
    def create_video(self) -> bool:
        """Create the final video"""
        print("Starting optimized video creation...")
        start_time = time.time()
        
        try:
            if not self.process_images():
                print("Failed to process images", flush=True)
                return False
            
            # Calculate duration
            last_frame_end = self.frames_data[-1].end_ms
            start_ms = self.config.start_time_ms if self.config.start_time_ms > 0 else 0
            
            if self.config.end_time_ms > 0 and self.config.end_time_ms < last_frame_end:
                duration_ms = self.config.end_time_ms
            else:
                duration_ms = last_frame_end
            duration_sec = (duration_ms - start_ms) / 1000.0
            print(f"Video duration: {duration_sec:.2f}s ({start_ms}ms to {duration_ms}ms)")
            
            self.setup_background(duration_sec, start_ms, duration_ms)
            
            audio = self._load_audio()
            self.logger.set_audio_status(audio is not None)
            
            def make_frame_wrapper(t):
                return self.make_frame_optimized(t)
            
            video = VideoClip(make_frame_wrapper, duration=duration_sec)
            
            if audio:
                try:
                    # Calculate audio trimming
                    if self.config.audio_path:
                        audio_start_sec = start_ms / 1000.0
                        available_audio_duration = audio.duration - audio_start_sec
                        
                        if available_audio_duration > 0:
                            # Trim audio from start position
                            trimmed_audio = audio.subclip(audio_start_sec, min(audio.duration, audio_start_sec + duration_sec))
                            
                            # Extend with silence if needed
                            if trimmed_audio.duration < duration_sec:
                                trimmed_audio = self._extend_audio_with_silence(trimmed_audio, duration_sec)
                        else:
                            print(f"Warning: Audio start time {audio_start_sec:.2f}s exceeds audio duration {audio.duration:.2f}s", flush=True)
                            # Create silent audio for the entire duration
                            silent_audio = audio.subclip(0, min(0.1, audio.duration)).volumex(0.0)
                            trimmed_audio = silent_audio.loop(duration=duration_sec)
                    else:
                        # Background audio case
                        if audio.duration < duration_sec:
                            trimmed_audio = self._extend_audio_with_silence(audio, duration_sec)
                        else:
                            trimmed_audio = audio.subclip(0, duration_sec)
                    
                    # Apply audio fade effects
                    fade_start_sec = self.config.audio_fade_start / 1000.0
                    fade_end_sec = self.config.audio_fade_end / 1000.0
                    
                    if fade_start_sec > 0 or fade_end_sec > 0:
                        print(f"Applying audio fade: start={fade_start_sec:.2f}s, end={fade_end_sec:.2f}s", flush=True)
                        
                        # Apply fade-in at the beginning
                        if fade_start_sec > 0 and fade_start_sec < trimmed_audio.duration:
                            trimmed_audio = trimmed_audio.audio_fadein(fade_start_sec)
                        
                        # Apply fade-out at the end
                        if fade_end_sec > 0 and fade_end_sec < trimmed_audio.duration:
                            trimmed_audio = trimmed_audio.audio_fadeout(fade_end_sec)
                    
                    final_video = video.set_audio(trimmed_audio)
                except Exception as e:
                    print(f"Warning: Could not set audio: {e}", flush=True)
                    final_video = video
            else:
                final_video = video
            
            print(f"Exporting to {self.config.output_path}...", flush=True)
            
            export_params = {
                'fps': self.config.fps,
                'codec': 'libx264',
                'preset': 'medium',
                'threads': min(self.config.threads, 6),
                'ffmpeg_params': [
                    '-crf', '20',
                    '-pix_fmt', 'yuv420p',
                    '-movflags', '+faststart',
                    '-profile:v', 'high',
                    '-level', '4.0'
                ],
                'logger': self.logger,
                'verbose': False,
                'temp_audiofile': None
            }
            
            if audio:
                export_params['audio_codec'] = 'aac'
                export_params['audio_bitrate'] = '128k'
            
            final_video.write_videofile(self.config.output_path, **export_params)
            
            self._cleanup()
            
            elapsed = time.time() - start_time
            print(f"✅ Video created successfully in {elapsed:.2f}s", flush=True)
            print(f"Final duration: {duration_sec:.2f}s", flush=True)
            
            return True
            
        except Exception as e:
            print(f"❌ Error creating video: {e}", flush=True)
            import traceback
            traceback.print_exc()
            return False
    
    def _load_audio(self) -> Optional[AudioFileClip]:
        """Load audio file with fallback to background audio and silence extension"""
        try:
            if self.config.audio_path and os.path.exists(self.config.audio_path):
                audio = AudioFileClip(self.config.audio_path)
                print(f"Audio loaded: {self.config.audio_path} (duration: {audio.duration:.2f}s)", flush=True)
                return audio
            elif self.background_processor and self.background_processor.video_clip and self.background_processor.video_clip.audio:
                print("Using background video audio", flush=True)
                return self.background_processor.video_clip.audio
            else:
                print("No audio available", flush=True)
        except Exception as e:
            print(f"Warning: Could not load audio: {e}", flush=True)
        return None

    def _extend_audio_with_silence(self, audio: AudioFileClip, target_duration: float) -> AudioFileClip:
        """Extend audio with silence to match target duration"""
        try:
            if audio.duration >= target_duration:
                return audio
            
            print(f"Extending audio from {audio.duration:.2f}s to {target_duration:.2f}s with silence", flush=True)
            
            # Create silence for the remaining duration
            silence_duration = target_duration - audio.duration
            
            # Create a silent audio clip
            # We use a simple approach: create a very quiet audio clip
            silent_audio = audio.subclip(0, min(0.1, audio.duration)).volumex(0.0)
            silent_audio = silent_audio.loop(duration=silence_duration)
            
            # Concatenate original audio with silence
            from moviepy.editor import concatenate_audioclips
            extended_audio = concatenate_audioclips([audio, silent_audio])
            
            return extended_audio
            
        except Exception as e:
            print(f"Warning: Could not extend audio with silence: {e}")
            return audio
    
    def _cleanup(self):
        """Cleanup resources and temporary files"""
        try:
            self.image_cache.clear()
            
            if self.background_processor and self.background_processor.video_clip:
                self.background_processor.video_clip.close()
            
            if os.path.exists(self.config.folder_path):
                shutil.rmtree(self.config.folder_path)
                print(f"Cleaned up source folder: {self.config.folder_path}", flush=True)
        except Exception as e:
            print(f"Warning: Cleanup failed: {e}", flush=True)

def main():
    """Main entry point"""
    # DEBUG: Forcer l'encodage UTF-8 pour stdout/stderr dès le début
    try:
        import sys
        import io
        
        # Debugging des arguments reçus AVANT tout autre traitement
        print("=== DEBUG: Raw arguments received ===", flush=True)
        print(f"sys.argv length: {len(sys.argv)}", flush=True)
        
        for i, arg in enumerate(sys.argv):
            try:
                print(f"argv[{i}]: {repr(arg)} (type: {type(arg).__name__})", flush=True)
                # Test d'encodage
                arg_bytes = arg.encode('utf-8')
                print(f"  -> UTF-8 bytes: {arg_bytes[:50]}{'...' if len(arg_bytes) > 50 else ''}", flush=True)
                # Test de décodage
                decoded = arg_bytes.decode('utf-8')
                print(f"  -> Re-decoded: {repr(decoded)}", flush=True)
            except Exception as e:
                print(f"  -> ERROR processing arg[{i}]: {e}", flush=True)
        
        print("=== END DEBUG ===", flush=True)
        
        # S'assurer que stdout utilise UTF-8
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8')
        
    except Exception as e:
        print(f"DEBUG ERROR: {e}", flush=True)
    
    parser = argparse.ArgumentParser(description="Fixed Video Creator v2.4 - Fixed Portrait Mode")
    parser.add_argument("folder_path", help="Path to folder containing PNG images")
    parser.add_argument("audio_path", help="Path to audio file")
    parser.add_argument("transition_ms", type=int, help="Transition duration in milliseconds")
    parser.add_argument("start_time", type=int, help="Start time for trimming (ms, 0=no trim)")
    parser.add_argument("end_time", type=int, help="End time for trimming (ms, 0=until end)")
    parser.add_argument("output_path", help="Output video path")
    parser.add_argument("top_ratio", type=float, help="Top section height ratio (0.0-0.5)")
    parser.add_argument("bottom_ratio", type=float, help="Bottom section height ratio (0.0-0.5)")
    parser.add_argument("dynamic_top", type=int, help="Dynamic top section (1=yes, 0=no)")
    parser.add_argument("background_path", help="Background image/video path (empty=none)")
    parser.add_argument("background_x", type=int, help="Background X translation")
    parser.add_argument("background_y", type=int, help="Background Y translation")
    parser.add_argument("background_scale", type=float, help="Background scale factor")
    parser.add_argument("audio_fade_start", type=int, help="Audio fade in duration at start (ms)")
    parser.add_argument("audio_fade_end", type=int, help="Audio fade out duration at end (ms)")
    parser.add_argument("force_portrait", type=int, help="Force portrait mode for TikTok (1=yes, 0=no)")
    parser.add_argument("--fps", type=int, default=DEFAULT_FPS, help="Output FPS")
    parser.add_argument("--threads", type=int, default=DEFAULT_THREADS, help="Processing threads")
    
    print("DEBUG: Parsing arguments...", flush=True)
    args = parser.parse_args()
    print("DEBUG: Arguments parsed successfully", flush=True)
    
    print("=== Video Creator v2.4 - Fixed Portrait Mode ===")
    print(f"Input folder: {args.folder_path}", flush=True)
    
    # DEBUG: Test spécifique pour le chemin audio
    try:
        print("DEBUG: About to print audio path...", flush=True)
        audio_path_repr = repr(args.audio_path)
        print(f"DEBUG: audio_path repr: {audio_path_repr}", flush=True)
        print(f"Audio: {args.audio_path}")
        print("DEBUG: Audio path printed successfully", flush=True)
    except Exception as e:
        print(f"DEBUG: ERROR printing audio path: {e}", flush=True)
        print(f"DEBUG: Exception type: {type(e).__name__}", flush=True)
        import traceback
        traceback.print_exc()
    
    print(f"Output: {args.output_path}", flush=True)
    print(f"Transition: {args.transition_ms}ms", flush=True)
    print(f"Background: {args.background_path}", flush=True)
    print(f"Transform: X={args.background_x}, Y={args.background_y}, Scale={args.background_scale}", flush=True)
    print(f"Audio Fade: Start={args.audio_fade_start}ms, End={args.audio_fade_end}ms", flush=True)
    print(f"Portrait Mode: {'Yes' if args.force_portrait == 1 else 'No'}", flush=True)
    print(f"FPS: {args.fps}, Threads: {args.threads}", flush=True)
    print()
    
    if not (0 <= args.top_ratio <= 0.5 and 0 <= args.bottom_ratio <= 0.5 and 
            args.top_ratio + args.bottom_ratio <= 1):
        raise ValueError("Invalid ratios: must be 0.0-0.5 and sum <= 1.0")
    
    config = VideoConfig(
        folder_path=args.folder_path,
        audio_path=args.audio_path,
        output_path=args.output_path,
        transition_ms=args.transition_ms,
        start_time_ms=args.start_time,
        end_time_ms=args.end_time,
        top_ratio=args.top_ratio,
        bottom_ratio=args.bottom_ratio,
        dynamic_top=bool(args.dynamic_top),
        background_path=args.background_path,
        background_transform=BackgroundTransform(
            translate_x=args.background_x,
            translate_y=args.background_y,
            scale=args.background_scale
        ),
        audio_fade_start=args.audio_fade_start,
        audio_fade_end=args.audio_fade_end,
        force_portrait=args.force_portrait,
        fps=args.fps,
        threads=args.threads
    )
    
    creator = OptimizedVideoCreator(config)
    success = creator.create_video()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

# Test avec mode portrait CORRIGÉ :
# py video_creator.py "F:\Programmation\tauri\QuranCaption-2\src-tauri\target\debug\export\3" "F:\Annexe\Montage vidéo\quran.al.luhaidan\88\audio_3541.webm" 300 0 2000 "./output_portrait.mp4" 0.25 0.25 0 "" 0 0 1.0 0 0 1



# Test avec img de fond : 
# py video_creator.py "F:\Programmation\tauri\QuranCaption-2\src-tauri\target\debug\export\3" "F:\Annexe\Montage vidéo\quran.al.luhaidan\88\audio_3541.webm" 300 0 32000 "./output.mp4" 0.25 0.25 0 "F:\Annexe\Montage vidéo\quran.al.luhaidan\bg sky.png" 0 0 1.0

# test avec video de fond :
# py video_creator.py "F:\Programmation\tauri\QuranCaption-2\src-tauri\target\debug\export\3" "F:\Annexe\Montage vidéo\quran.al.luhaidan\88\audio_3541.webm" 300 0 0 "./output.mp4" 0.25 0.25 0 "F:\Annexe\Montage vidéo\quran.al.luhaidan\test\video_4673.mp4" 0 0 1.0 0 0

# test sans fond : 
# py video_creator.py "F:\Programmation\tauri\QuranCaption-2\src-tauri\target\debug\export\3" "F:\Annexe\Montage vidéo\quran.al.luhaidan\88\audio_3541.webm" 300 0 0 "./output.mp4" 0.25 0.25 0 "" 0 0 1.0

# test avec transformations background :
# py video_creator.py "F:\Programmation\tauri\QuranCaption-2\src-tauri\target\debug\export\3" "F:\Annexe\Montage vidéo\quran.al.luhaidan\88\audio_3541.webm" 300 0 32000 "./output.mp4" 0.25 0.25 0 "F:\Annexe\Montage vidéo\quran.al.luhaidan\bg sky.png" 50 -30 1.5

# Nancy

# py video_creator.py "C:\Users\zonedetec\AppData\Local\Quran Caption\export\2" "C:\Users\zonedetec\Documents\quran.al.luhaidan\49\audio_40كلمة08.webm" 300 0 6000 "./outكلمةput.mp4" 0.25 0.25 0 "" 0 0 0 1.0 0 0 0

# ./video_creator.exe "C:\Users\zonedetec\AppData\Local\Quran Caption\export\2" "C:\Users\zonedetec\Documents\quran.al.luhaidan\49\audio_40كلمة08.webm" 300 0 6000 "./outكلمةput.mp4" 0.25 0.25 0 "" 0 0 0 1.0 0 0 0