
import os
import tempfile
import io
from typing import Optional, Dict
from moviepy.editor import VideoFileClip
import whisper
import logging
import cv2
import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)


class VideoProcessor:

    def __init__(self):
        """Initialize VideoProcessor with required models."""
        self.whisper_model = None
        self._load_whisper_model()
    
    def _load_whisper_model(self):
        """Load Whisper model for transcription (Local-first or Mock)."""
        try:
            # Import config to get MODEL_DIR
            import sys
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from config import get_config
            config = get_config()
            
            whisper_dir = os.path.join(config.MODEL_DIR, 'whisper')
            os.makedirs(whisper_dir, exist_ok=True)
            
            # Check for local model files to prevent automatic downloads
            medium_path = os.path.join(whisper_dir, 'medium.pt')
            base_path = os.path.join(whisper_dir, 'base.pt')
            
            if os.path.exists(medium_path):
                logger.info(f"Loading local Whisper medium model from {whisper_dir}...")
                self.whisper_model = whisper.load_model("medium", download_root=whisper_dir)
            elif os.path.exists(base_path):
                logger.info(f"Loading local Whisper base model from {whisper_dir}...")
                self.whisper_model = whisper.load_model("base", download_root=whisper_dir)
            else:
                logger.warning(f"Whisper model files (.pt) not found in {whisper_dir}. Using Mock transcription.")
                self._setup_mock_whisper()
                
        except Exception as e:
            logger.error(f"Error loading Whisper model: {e}")
            self._setup_mock_whisper()

    def _setup_mock_whisper(self):
        """Initialize a mock whisper model for development."""
        class MockWhisper:
            def transcribe(self, audio_path, **kwargs):
                return {
                    "text": "[MOCK TRANSCRIPTION] This is a mock transcription because no Whisper model was found in the ai_models/whisper directory.",
                    "language": "en",
                    "segments": [
                        {"start": 0.0, "end": 10.0, "text": "Mock video segment transcription."},
                        {"start": 10.0, "end": 20.0, "text": "This is a placeholder for development."}
                    ]
                }
        self.whisper_model = MockWhisper()

    
    def extract_audio(self, video_path: str, output_audio_path: Optional[str] = None) -> str:
        """
        Extract audio from video file using FFmpeg directly (memory efficient).
        
        Args:
            video_path: Path to video file
            output_audio_path: Optional path to save audio file
            
        Returns:
            Path to extracted audio file
        """
        try:
            if output_audio_path is None:
                # Create temporary audio file
                temp_dir = tempfile.gettempdir()
                output_audio_path = os.path.join(temp_dir, f"audio_{os.path.basename(video_path)}.wav")
            
            logger.info(f"Extracting audio from video: {video_path}")
            
            # Try FFmpeg directly first (more memory efficient)
            try:
                import subprocess
                
                # Find ffmpeg executable
                ffmpeg_cmd = 'ffmpeg'
                
                # Build FFmpeg command
                cmd = [
                    ffmpeg_cmd,
                    '-i', video_path,
                    '-vn',  # No video
                    '-acodec', 'pcm_s16le',  # WAV format
                    '-ar', '16000',  # 16kHz sample rate (good for speech)
                    '-ac', '1',  # Mono
                    '-y',  # Overwrite output
                    output_audio_path
                ]
                
                logger.info(f"Running FFmpeg: {' '.join(cmd)}")
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout
                )
                
                if result.returncode == 0 and os.path.exists(output_audio_path):
                    logger.info(f"Audio extracted successfully using FFmpeg: {output_audio_path}")
                    return output_audio_path
                else:
                    logger.warning(f"FFmpeg failed: {result.stderr}")
                    raise Exception("FFmpeg extraction failed")
                    
            except FileNotFoundError:
                logger.warning("FFmpeg not found, falling back to MoviePy")
            except subprocess.TimeoutExpired:
                logger.warning("FFmpeg timeout, falling back to MoviePy")
            except Exception as e:
                logger.warning(f"FFmpeg error: {e}, falling back to MoviePy")
            
            # Fallback to MoviePy (memory intensive)
            logger.info("Using MoviePy for audio extraction (fallback)")
            video = VideoFileClip(video_path)
            audio = video.audio
            
            if audio is None:
                video.close()
                raise Exception("No audio track found in video")
            
            audio.write_audiofile(output_audio_path, verbose=False, logger=None)
            audio.close()
            video.close()
            
            logger.info(f"Audio extracted successfully: {output_audio_path}")
            return output_audio_path
            
        except Exception as e:
            logger.error(f"Error extracting audio: {e}")
            raise Exception(f"Failed to extract audio from video: {str(e)}")
    
    def transcribe_audio(self, audio_path: str, language: Optional[str] = None) -> Dict[str, any]:

        if self.whisper_model is None:
            raise Exception("Whisper model not loaded")
        
        try:
            logger.info(f"Transcribing audio: {audio_path}")
            
            # Improved transcription with better parameters (NoteGPT style)
            # Use translate task for non-Urdu to get English transcription
            if language and language.lower() != 'ur' and language.lower() != 'urdu':
                # Transcribe and translate to English for better summarization
                result = self.whisper_model.transcribe(
                    audio_path,
                    language=language if language else None,
                    task="translate",  # Translate to English
                    verbose=False,
                    fp16=False,  # Use fp32 for better accuracy
                    condition_on_previous_text=False,  # Set to False to prevent Whisper from skipping audio (hallucinating silence)
                    word_timestamps=True, # Added to force precise word-level detection and prevent skipping
                    initial_prompt="This is a lecture or educational content. Please transcribe accurately with proper punctuation and sentence structure."
                )
            else:
                # For Urdu or auto-detect, just transcribe with better settings
                result = self.whisper_model.transcribe(
                    audio_path,
                    language=language if language else None,
                    verbose=False,
                    fp16=False,
                    condition_on_previous_text=False, # Prevent skipping/silence hallucination
                    word_timestamps=True, # Precise timestamp detection
                    initial_prompt="This is a lecture or educational content. Please transcribe accurately with proper punctuation and sentence structure."
                )
            
            transcription_text = result.get("text", "").strip()
            detected_language = result.get("language", "unknown")
            
            logger.info(f"Transcription completed. Language: {detected_language}, Length: {len(transcription_text)} chars")
            
            segments = result.get("segments", [])
            try:
                from utils.text_cleaner import TextCleaner
                segments = TextCleaner().split_segments_into_sentences(segments)
                logger.info(f"Split transcription into {len(segments)} sentence-level segments.")
            except Exception as split_err:
                logger.error(f"Error splitting segments: {split_err}")
                
            return {
                "text": transcription_text,
                "language": detected_language,
                "segments": segments
            }
            
        except Exception as e:
            logger.error(f"Error transcribing audio: {e}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")
    
    def process_video(
        self, 
        video_path: str, 
        language: Optional[str] = None
    ) -> Dict[str, any]:

        try:
            logger.info(f"Processing video: {video_path}")
            
            # Step 1: Extract audio
            audio_path = self.extract_audio(video_path)
            
            # Step 2: Transcribe audio
            transcription_result = self.transcribe_audio(audio_path, language)
            audio_text = transcription_result["text"]
            detected_language = transcription_result["language"]
            
            # Clean transcription for better summarization
            if audio_text:
                audio_text = self._clean_transcription(audio_text)
            
            # Clean up temporary audio file
            try:
                if os.path.exists(audio_path):
                    os.remove(audio_path)
            except:
                pass
            
            logger.info(f"Video processing completed. Transcription length: {len(audio_text)} chars")
            
            return {
                "combined_text": audio_text,
                "audio_transcription": audio_text,
                "segments": transcription_result.get("segments", []),
                "detected_language": detected_language,
                "video_duration": self._get_video_duration(video_path),
                "frame_text": self._extract_frame_text(video_path)
            }
            
        except Exception as e:
            logger.error(f"Error processing video: {e}")
            raise Exception(f"Failed to process video: {str(e)}")
    
    def _get_video_duration(self, video_path: str) -> float:
        """Get video duration in seconds."""
        try:
            video = VideoFileClip(video_path)
            duration = video.duration
            video.close()
            return duration
        except:
            return 0.0
    
    def _clean_transcription(self, text: str) -> str:

        if not text:
            return text
        
        # Remove common filler words/phrases
        filler_words = ['um', 'uh', 'er', 'ah', 'like', 'you know', 'so', 'well']
        words = text.split()
        cleaned_words = []
        
        for word in words:
            word_lower = word.lower().strip('.,!?;:')
            if word_lower not in filler_words or len(cleaned_words) == 0:
                cleaned_words.append(word)
        
        cleaned = ' '.join(cleaned_words)
        
        # Fix common issues
        cleaned = cleaned.replace('  ', ' ')  # Double spaces
        cleaned = cleaned.replace(' .', '.')  # Space before period
        cleaned = cleaned.replace(' ,', ',')  # Space before comma
        
        # Ensure proper sentence endings
        if cleaned and not cleaned[-1] in '.!?':
            cleaned += '.'
        
        return cleaned.strip()
    
    def process_video_from_bytes(
        self, 
        video_bytes: bytes, 
        filename: str,
        language: Optional[str] = None
    ) -> Dict[str, any]:

        # Create temporary video file
        temp_dir = tempfile.gettempdir()
        temp_video_path = os.path.join(temp_dir, f"video_{os.urandom(8).hex()}_{filename}")
        
        try:
            # Write bytes to temporary file
            with open(temp_video_path, 'wb') as f:
                f.write(video_bytes)
            
            # Process video
            result = self.process_video(temp_video_path, language)
            
            return result
            
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(temp_video_path):
                    os.remove(temp_video_path)
            except:
                pass

    def _extract_frame_text(self, video_path: str, interval: int = 2) -> str:
        # Disabled frame-based OCR text extraction to improve speed and prevent freezes.
        return ""

    def _old_extract_frame_text_disabled(self, video_path: str, interval: int = 2) -> str:
        """
        Extract text from video frames using OCR with a robust FFmpeg fallback for unsupported codecs (e.g. AV1).
        
        Args:
            video_path: Path to video file
            interval: Interval in seconds between frames to sample
            
        Returns:
            Extracted text from frames
        """
        try:
            logger.info(f"Extracting screen text from: {video_path}")
            
            extracted_texts = []
            seen_texts = set()
            
            # Step 1: Check if OpenCV can open and successfully read frames (AV1 check)
            import contextlib
            import sys
            
            @contextlib.contextmanager
            def suppress_stderr():
                """Temporarily redirect standard error at the OS level to suppress C-level warnings."""
                try:
                    stderr_fd = sys.stderr.fileno()
                    saved_stderr_fd = os.dup(stderr_fd)
                    devnull = open(os.devnull, 'wb')
                    os.dup2(devnull.fileno(), stderr_fd)
                    try:
                        yield
                    finally:
                        os.dup2(saved_stderr_fd, stderr_fd)
                        os.close(saved_stderr_fd)
                        devnull.close()
                except Exception:
                    yield

            opencv_usable = False
            with suppress_stderr():
                cap = cv2.VideoCapture(video_path)
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret and frame is not None:
                        opencv_usable = True
                    cap.release()
            
            if opencv_usable:
                logger.info("Using OpenCV VideoCapture to read frames")
                with suppress_stderr():
                    cap = cv2.VideoCapture(video_path)
                    fps = cap.get(cv2.CAP_PROP_FPS)
                    if fps <= 0: fps = 24
                    
                    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    duration = frame_count / fps
                    
                    # Sample frames every 'interval' seconds
                    for t in range(0, int(duration), interval):
                        frame_idx = int(t * fps)
                        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                        ret, frame = cap.read()
                        
                        if not ret or frame is None:
                            continue
                        
                        # Preprocess frame for better OCR
                        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                        _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                        
                        # Perform OCR
                        text = pytesseract.image_to_string(thresh, lang='eng').strip()
                        
                        if text and len(text) > 3:
                            text = ' '.join(text.split())
                            if text not in seen_texts:
                                extracted_texts.append(text)
                                seen_texts.add(text)
                    
                    cap.release()
            else:
                # Step 2: Fallback to system-level FFmpeg for modern codecs (like AV1)
                logger.info("OpenCV VideoCapture failed or AV1 codec is not supported. Falling back to native FFmpeg frame extraction.")
                
                import subprocess
                import shutil
                
                # Create a secure temporary directory
                temp_dir = tempfile.mkdtemp(prefix="ffmpeg_ocr_frames_")
                try:
                    # Output pattern for FFmpeg: frame_0001.png, frame_0002.png, etc.
                    output_pattern = os.path.join(temp_dir, "frame_%04d.png")
                    
                    # Run FFmpeg command to extract one frame every 'interval' seconds
                    # e.g., if interval=2, fps=1/2 means one frame every 2 seconds
                    cmd = [
                        'ffmpeg', '-y',
                        '-i', video_path,
                        '-vf', f'fps=1/{interval}',
                        '-vsync', 'vfr',  # Variable frame rate to match interval precisely
                        output_pattern
                    ]
                    
                    logger.info(f"Running FFmpeg frame extraction: {' '.join(cmd)}")
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                    
                    if result.returncode == 0 and os.path.exists(temp_dir):
                        frame_files = sorted([
                            os.path.join(temp_dir, f) 
                            for f in os.listdir(temp_dir) 
                            if f.lower().endswith('.png')
                        ])
                        
                        logger.info(f"FFmpeg successfully extracted {len(frame_files)} frames for OCR processing")
                        
                        for f_path in frame_files:
                            frame = cv2.imread(f_path)
                            if frame is not None:
                                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                                _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                                
                                text = pytesseract.image_to_string(thresh, lang='eng').strip()
                                
                                if text and len(text) > 3:
                                    text = ' '.join(text.split())
                                    if text not in seen_texts:
                                        extracted_texts.append(text)
                                        seen_texts.add(text)
                    else:
                        logger.error(f"FFmpeg frame extraction failed: {result.stderr}")
                
                finally:
                    # Secure cleanup of temporary directory and extracted frames
                    if os.path.exists(temp_dir):
                        shutil.rmtree(temp_dir, ignore_errors=True)
            
            # Combine and deduplicate similar consecutive strings
            final_texts = []
            for text in extracted_texts:
                if not final_texts or text != final_texts[-1]:
                    final_texts.append(text)
            
            result = '\n'.join(final_texts)
            logger.info(f"Extracted {len(final_texts)} unique text snippets from frames")
            return result
            
        except Exception as e:
            logger.error(f"OCR Error: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return ""

