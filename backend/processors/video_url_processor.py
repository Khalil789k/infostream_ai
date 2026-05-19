

import os
import tempfile
import logging
import re
from typing import Optional, Dict, Any
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)


class VideoURLProcessor:

    
    SUPPORTED_PLATFORMS = [
        'youtube.com', 'youtu.be',
        'vimeo.com',
        'dailymotion.com',
        'twitter.com', 'x.com',
        'facebook.com', 'fb.watch',
        'instagram.com',
        'tiktok.com'
    ]
    
    def __init__(self):
        """Initialize VideoURLProcessor."""
        self.download_dir = tempfile.gettempdir()
        self._check_yt_dlp()
    
    def _check_yt_dlp(self):
        """Check if yt-dlp is available."""
        try:
            import yt_dlp
            self.yt_dlp_available = True
            logger.info("yt-dlp is available for video downloads")
        except ImportError:
            self.yt_dlp_available = False
            logger.warning("yt-dlp not installed. Install with: pip install yt-dlp")
    
    def is_video_url(self, url: str) -> bool:

        try:
            if not url or not isinstance(url, str):
                return False
            
            url_lower = url.lower().strip()
            parsed = urlparse(url_lower)
            hostname = parsed.netloc.replace('www.', '').replace('m.', '')
            
            logger.info(f"Checking if URL is video: {url_lower[:50]}... hostname={hostname}")
            
            for platform in self.SUPPORTED_PLATFORMS:
                if platform in hostname:
                    logger.info(f"Detected video platform: {platform}")
                    return True
            
            # Check for direct video URLs
            video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.m4v']
            path_lower = parsed.path.lower()
            if any(path_lower.endswith(ext) for ext in video_extensions):
                logger.info(f"Detected direct video URL with extension")
                return True
            
            logger.info(f"URL is not a video URL")
            return False
            
        except Exception as e:
            logger.error(f"Error checking video URL: {e}")
            return False
    
    def get_platform_info(self, url: str) -> Dict[str, Any]:

        try:
            parsed = urlparse(url.lower())
            hostname = parsed.netloc.replace('www.', '').replace('m.', '')
            
            platform_map = {
                'youtube.com': {'name': 'YouTube', 'icon': 'youtube'},
                'youtu.be': {'name': 'YouTube', 'icon': 'youtube'},
                'vimeo.com': {'name': 'Vimeo', 'icon': 'vimeo'},
                'dailymotion.com': {'name': 'Dailymotion', 'icon': 'dailymotion'},
                'twitter.com': {'name': 'Twitter/X', 'icon': 'twitter'},
                'x.com': {'name': 'Twitter/X', 'icon': 'twitter'},
                'facebook.com': {'name': 'Facebook', 'icon': 'facebook'},
                'fb.watch': {'name': 'Facebook', 'icon': 'facebook'},
                'instagram.com': {'name': 'Instagram', 'icon': 'instagram'},
                'tiktok.com': {'name': 'TikTok', 'icon': 'tiktok'}
            }
            
            for platform_domain, info in platform_map.items():
                if platform_domain in hostname:
                    return {
                        'platform': info['name'],
                        'icon': info['icon'],
                        'is_video': True
                    }
            
            return {
                'platform': 'Unknown',
                'icon': 'video',
                'is_video': self.is_video_url(url)
            }
            
        except Exception:
            return {'platform': 'Unknown', 'icon': 'video', 'is_video': False}
    
    def extract_video_id(self, url: str) -> Optional[str]:

        try:
            parsed = urlparse(url)
            hostname = parsed.netloc.replace('www.', '').replace('m.', '')
            
            # YouTube
            if 'youtube.com' in hostname:
                query = parse_qs(parsed.query)
                return query.get('v', [None])[0]
            elif 'youtu.be' in hostname:
                return parsed.path.strip('/')
            
            # Vimeo
            elif 'vimeo.com' in hostname:
                path_parts = parsed.path.strip('/').split('/')
                for part in path_parts:
                    if part.isdigit():
                        return part
            
            # Return path as ID for other platforms
            return parsed.path.strip('/').split('/')[-1] or None
            
        except Exception:
            return None
    
    def get_video_info(self, url: str) -> Dict[str, Any]:

        if not self.yt_dlp_available:
            raise Exception("yt-dlp not installed. Install with: pip install yt-dlp")
        
        try:
            import yt_dlp
            
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'skip_download': True,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                return {
                    'title': info.get('title', 'Unknown'),
                    'description': info.get('description', ''),
                    'duration': info.get('duration', 0),
                    'uploader': info.get('uploader', 'Unknown'),
                    'upload_date': info.get('upload_date', ''),
                    'view_count': info.get('view_count', 0),
                    'like_count': info.get('like_count', 0),
                    'thumbnail': info.get('thumbnail', ''),
                    'formats_available': len(info.get('formats', [])),
                    'platform': self.get_platform_info(url)['platform']
                }
                
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            raise Exception(f"Failed to get video info: {str(e)}")
    
    def download_video(
        self, 
        url: str, 
        output_dir: Optional[str] = None,
        max_duration: int = 600,  # 10 minutes max
        quality: str = 'best'
    ) -> Dict[str, Any]:

        if not self.yt_dlp_available:
            raise Exception("yt-dlp not installed. Install with: pip install yt-dlp")
        
        import yt_dlp
        
        if output_dir is None:
            output_dir = self.download_dir
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate unique filename
        video_id = self.extract_video_id(url) or os.urandom(8).hex()
        output_template = os.path.join(output_dir, f"video_{video_id}_%(id)s.%(ext)s")
        
        # Configure format based on quality - Prefer H.264/MP4 for better compatibility with CV2/MoviePy
        # Using [vcodec!*=av01] to avoid AV1 which can cause decoding issues
        format_spec = 'bestvideo[vcodec!*=av01][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
        if quality == 'worst':
            format_spec = 'worstvideo+worstaudio/worst'
        elif quality == '720p':
            format_spec = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best'
        elif quality == '480p':
            format_spec = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best'
        elif quality == '360p':
            format_spec = 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best'
        
        ydl_opts = {
            'format': format_spec,
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            'merge_output_format': 'mp4',
            'postprocessors': [{
                'key': 'FFmpegVideoConvertor',
                'preferedformat': 'mp4',
            }],
        }
        
        try:
            logger.info(f"Downloading video from: {url}")
            
            # First, get video info to check duration
            with yt_dlp.YoutubeDL({'quiet': True, 'no_warnings': True}) as ydl:
                info = ydl.extract_info(url, download=False)
                duration = info.get('duration', 0)
                title = info.get('title', 'Unknown')
                
                if duration and duration > max_duration:
                    raise Exception(f"Video too long ({duration}s). Maximum allowed: {max_duration}s (10 minutes)")
            
            # Download the video
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            
            # Find the downloaded file
            downloaded_files = [
                f for f in os.listdir(output_dir) 
                if f.startswith(f"video_{video_id}_") and f.endswith('.mp4')
            ]
            
            if not downloaded_files:
                # Check for other extensions
                downloaded_files = [
                    f for f in os.listdir(output_dir) 
                    if f.startswith(f"video_{video_id}_")
                ]
            
            if not downloaded_files:
                raise Exception("Video download failed - file not found")
            
            downloaded_file = downloaded_files[0]
            file_path = os.path.join(output_dir, downloaded_file)
            file_size = os.path.getsize(file_path)
            
            logger.info(f"Video downloaded successfully: {file_path} ({file_size} bytes)")
            
            return {
                'success': True,
                'file_path': file_path,
                'filename': downloaded_file,
                'title': title,
                'duration': duration,
                'file_size': file_size,
                'video_id': video_id,
                'platform': self.get_platform_info(url)['platform']
            }
            
        except Exception as e:
            logger.error(f"Error downloading video: {e}")
            raise Exception(f"Failed to download video: {str(e)}")
    
    def process_video_url(
        self,
        url: str,
        video_processor,
        output_dir: Optional[str] = None,
        extract_frames_fps: float = 1.0,
        language: Optional[str] = None
    ) -> Dict[str, Any]:

        try:
            logger.info(f"Processing video URL: {url}")
            
            # Step 1: Download video
            download_result = self.download_video(url, output_dir)
            video_path = download_result['file_path']
            title = download_result['title']
            
            # Step 2: Process video using VideoProcessor
            process_result = video_processor.process_video(
                video_path=video_path,
                language=language
            )
            
            # Combine results
            return {
                'success': True,
                'download_info': download_result,
                'video_path': video_path,
                'title': title,
                'combined_text': process_result.get('combined_text', ''),
                'audio_transcription': process_result.get('audio_transcription', ''),
                'frame_text': process_result.get('frame_text', ''),  # May not be present if frame extraction not implemented
                'segments': process_result.get('segments', []),
                'detected_language': process_result.get('detected_language', 'unknown'),
                'video_duration': process_result.get('video_duration', download_result.get('duration', 0)),
                'frames_extracted': process_result.get('frames_extracted', 0),  # May not be present if frame extraction not implemented
                'platform': download_result['platform']
            }
            
        except Exception as e:
            logger.error(f"Error processing video URL: {e}")
            raise Exception(f"Failed to process video URL: {str(e)}")
    
    def cleanup_downloaded_file(self, file_path: str):
        """Clean up downloaded video file."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up: {file_path}")
        except Exception as e:
            logger.warning(f"Could not clean up file: {e}")


# Singleton instance
_video_url_processor = None


def get_video_url_processor() -> VideoURLProcessor:
    """Get or create VideoURLProcessor singleton."""
    global _video_url_processor
    if _video_url_processor is None:
        _video_url_processor = VideoURLProcessor()
    return _video_url_processor

