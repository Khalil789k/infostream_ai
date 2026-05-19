

import os
import tempfile
import logging
import asyncio
from typing import Optional, Tuple, List, Dict, Any
from moviepy.editor import VideoFileClip, AudioFileClip, CompositeAudioClip, concatenate_audioclips, vfx
import io

import threading

logger = logging.getLogger(__name__)


def _run_coroutine(coro):
    """Run an async coroutine synchronously, handling existing running event loops safely."""
    try:
        # Check if an event loop is already running in this thread
        asyncio.get_running_loop()
        
        # If yes, execute the coroutine in a separate worker thread with a new loop to avoid RuntimeError
        result = None
        exception = None
        
        def worker():
            nonlocal result, exception
            loop = asyncio.new_event_loop()
            try:
                result = loop.run_until_complete(coro)
            except Exception as e:
                exception = e
            finally:
                loop.close()
                
        thread = threading.Thread(target=worker)
        thread.start()
        thread.join()
        
        if exception:
            raise exception
        return result
        
    except RuntimeError:
        # No event loop is running in this thread, we can run it directly
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()


class VoiceDubber:

    
    # Urdu voices available in Edge TTS
    URDU_VOICES = {
        'female': 'ur-PK-UzmaNeural',  # Natural female voice
        'male': 'ur-PK-AsadNeural',     # Natural male voice
    }
    
    # Hindi voices (similar to Urdu, good quality)
    HINDI_VOICES = {
        'female': 'hi-IN-SwaraNeural',
        'male': 'hi-IN-MadhurNeural',
    }
    
    def __init__(self):
        """Initialize VoiceDubber with TTS engines."""
        self.edge_tts_available = self._check_edge_tts()
        self.offline_tts = None
        if not self.edge_tts_available:
            self._init_offline_tts()
    
    def _check_edge_tts(self) -> bool:
        """Check if edge-tts is available."""
        try:
            import edge_tts
            logger.info("Edge TTS is available for high-quality Urdu voices")
            return True
        except ImportError:
            logger.warning("edge-tts not installed. Install with: pip install edge-tts")
            return False
    
    def _init_offline_tts(self):
        """Initialize offline TTS engine (pyttsx3) as fallback."""
        try:
            import pyttsx3
            self.offline_tts = pyttsx3.init()
            # Configure for best quality
            voices = self.offline_tts.getProperty('voices')
            # Try to find Urdu voice, fallback to default
            for voice in voices:
                if 'urdu' in voice.name.lower() or 'ur' in voice.id.lower():
                    self.offline_tts.setProperty('voice', voice.id)
                    break
            
            # Set speech rate and volume
            self.offline_tts.setProperty('rate', 150)
            self.offline_tts.setProperty('volume', 0.9)
            
            logger.info("Offline TTS engine initialized as fallback")
        except Exception as e:
            logger.warning(f"Could not initialize offline TTS: {e}")
            self.offline_tts = None
    
    async def _generate_audio_edge_tts(
        self, 
        text: str, 
        output_path: str,
        voice: str = 'female',
        rate: str = '+0%',
        pitch: str = '+0Hz'
    ) -> str:
     
        import edge_tts
        
        # Select voice
        voice_name = self.URDU_VOICES.get(voice, self.URDU_VOICES['female'])
        
        logger.info(f"Generating audio with Edge TTS voice: {voice_name}")
        
        communicate = edge_tts.Communicate(
            text=text,
            voice=voice_name,
            rate=rate,
            pitch=pitch
        )
        
        await communicate.save(output_path)
        
        if not os.path.exists(output_path):
            raise Exception(f"Edge TTS failed to create audio file: {output_path}")
        
        logger.info(f"Edge TTS audio generated: {output_path} ({os.path.getsize(output_path)} bytes)")
        return output_path
    
    def generate_urdu_audio(
        self, 
        text: str, 
        output_path: Optional[str] = None,
        voice: str = 'female',
        rate: str = '+0%',
        use_edge_tts: bool = True
    ) -> str:
      
        try:
            if output_path is None:
                temp_dir = tempfile.gettempdir()
                output_path = os.path.join(temp_dir, f"urdu_audio_{os.urandom(8).hex()}.mp3")
            
            if use_edge_tts and self.edge_tts_available:
                # Use Edge TTS for best quality
                _run_coroutine(self._generate_audio_edge_tts(text, output_path, voice, rate))
            else:
                # Fallback to gTTS or offline TTS
                self._generate_audio_fallback(text, output_path)
            
            logger.info(f"Urdu audio generated: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error generating Urdu audio: {e}")
            raise Exception(f"Failed to generate Urdu audio: {str(e)}")
    
    def _generate_audio_fallback(self, text: str, output_path: str):
        """Fallback audio generation using gTTS or pyttsx3."""
        try:
            # Try gTTS first
            from gtts import gTTS
            logger.info("Using gTTS for audio generation")
            tts = gTTS(text=text, lang='ur', slow=False)
            tts.save(output_path)
        except Exception as e:
            logger.warning(f"gTTS failed: {e}, trying offline TTS")
            if self.offline_tts is not None:
                self.offline_tts.save_to_file(text, output_path)
                self.offline_tts.runAndWait()
            else:
                raise Exception("No TTS engine available")
    
    async def _generate_segment_audio_edge_tts(
        self,
        segment: Dict[str, Any],
        output_path: str,
        target_duration: float,
        voice: str = 'female'
    ) -> Tuple[str, float]:
        
        import edge_tts
        
        text = segment.get('text', '').strip()
        if not text or not any(c.isalnum() for c in text):
            logger.info(f"Skipping empty or punctuation-only TTS segment text: '{text}'")
            return None, 0
        
        voice_name = self.URDU_VOICES.get(voice, self.URDU_VOICES['female'])
        
        # Calculate rate adjustment to match duration using calibrated character rates
        # Uzma (female): ~12.8 chars per second, Asad (male): ~12.4 chars per second
        cps = 12.8 if voice == 'female' else 12.4
        estimated_duration = len(text) / cps
        
        if target_duration > 0 and estimated_duration > 0:
            speed_ratio = estimated_duration / target_duration
            
            # Only speed up the Urdu voice if it is longer than the video segment.
            # Shorter segments are spoken at a perfectly natural human speed (+0%)
            # starting exactly at the active voice start timestamp, leaving silent gaps intact.
            if speed_ratio > 1.05:
                rate_percent = int((speed_ratio - 1.0) * 100)
                # Limit speed up to safe/intelligible range (max +60%) to preserve voice quality
                rate_percent = min(60, rate_percent)
                rate = f"+{rate_percent}%"
                logger.info(f"Speeding up segment: Target duration: {target_duration:.2f}s, estimated normal: {estimated_duration:.2f}s, ratio: {speed_ratio:.2f}x -> Edge TTS rate: {rate}")
            else:
                rate = '+0%'
                logger.info(f"Natural speed segment: Target duration: {target_duration:.2f}s, estimated normal: {estimated_duration:.2f}s -> Edge TTS rate: {rate}")
        else:
            rate = '+0%'
        
        communicate = edge_tts.Communicate(
            text=text,
            voice=voice_name,
            rate=rate
        )
        
        await communicate.save(output_path)
        
        # Get actual duration
        try:
            audio = AudioFileClip(output_path)
            actual_duration = audio.duration
            audio.close()
        except:
            actual_duration = estimated_duration
        
        return output_path, actual_duration
    
    def dub_video_with_segments(
        self,
        video_path: str,
        transcription_segments: List[Dict[str, Any]],
        urdu_segments: List[Dict[str, Any]],
        output_path: Optional[str] = None,
        voice: str = 'female',
        keep_original_audio: float = 0.0  # Muted to ensure original English voice is completely removed
    ) -> str:
        
        try:
            logger.info(f"Segment-based dubbing for video: {video_path}")
            
            if output_path is None:
                temp_dir = tempfile.gettempdir()
                base_name = os.path.basename(video_path)
                name_without_ext = os.path.splitext(base_name)[0]
                output_path = os.path.join(temp_dir, f"dubbed_segment_{name_without_ext}.mp4")
            
            # Ensure .mp4 extension
            if not output_path.lower().endswith('.mp4'):
                output_path = os.path.splitext(output_path)[0] + '.mp4'
            
            # Load video
            video = VideoFileClip(video_path)
            video_duration = video.duration
            original_audio = video.audio
            
            # Generate audio for each segment
            temp_audio_files = []
            audio_clips = []
            
            # Generate audio for each segment
            for i, (orig_seg, urdu_seg) in enumerate(zip(transcription_segments, urdu_segments)):
                urdu_text = urdu_seg.get('text', '').strip() if isinstance(urdu_seg, dict) else str(urdu_seg).strip()
                
                if not urdu_text or not any(c.isalnum() for c in urdu_text):
                    continue
                
                start_time = orig_seg.get('start', 0.0)
                end_time = orig_seg.get('end', 0.0)
                target_duration = end_time - start_time
                
                if target_duration <= 0:
                    continue
                
                # Generate audio for segment
                temp_path = os.path.join(tempfile.gettempdir(), f"seg_{i}_{os.urandom(4).hex()}.mp3")
                temp_audio_files.append(temp_path)
                
                audio_path = None
                if self.edge_tts_available:
                    try:
                        audio_path, actual_duration = _run_coroutine(
                            self._generate_segment_audio_edge_tts(
                                {'text': urdu_text},
                                temp_path,
                                target_duration,
                                voice
                            )
                        )
                    except Exception as e:
                        logger.warning(f"Edge TTS failed for segment '{urdu_text[:30]}...': {e}. Using fallback generator.")
                        audio_path = None
                
                # If Edge TTS wasn't available or failed, use the offline fallback generator
                if not audio_path:
                    self._generate_audio_fallback(urdu_text, temp_path)
                    audio_path = temp_path
                    actual_duration = target_duration
                    
                if audio_path and os.path.exists(audio_path):
                    # Load and position audio clip
                    audio_clip = AudioFileClip(audio_path)
                    
                    # We completely bypass MoviePy's speedx and subclip here to PREVENT the "chipmunk" pitch distortion
                    # and unnatural voice stretching. The voice has already been generated at the perfect human
                    # speed natively by Edge TTS. We simply let it play for its actual duration!
                    
                    # Set start time
                    audio_clip = audio_clip.set_start(start_time)
                    audio_clips.append(audio_clip)
                    
                    logger.info(f"Segment {i}: {start_time:.2f}s - {end_time:.2f}s, audio: {audio_clip.duration:.2f}s")
            
            # Compose final audio
            if audio_clips:
                # Mix with original audio if requested
                if keep_original_audio > 0 and original_audio is not None:
                    original_quiet = original_audio.volumex(keep_original_audio)
                    all_clips = [original_quiet] + audio_clips
                    final_audio = CompositeAudioClip(all_clips)
                else:
                    final_audio = CompositeAudioClip(audio_clips)
                
                final_audio = final_audio.set_duration(video_duration)
            else:
                # Use original audio if no segments generated
                final_audio = original_audio
            
            # Create final video
            final_video = video.set_audio(final_audio)
            
            # Ensure output directory exists
            output_dir = os.path.dirname(output_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir, exist_ok=True)
            
            # Write video
            logger.info(f"Rendering dubbed video to: {output_path}")
            
            try:
                # Direct high-speed FFmpeg copy/merge (sub-second rendering, zero deadlocks!)
                import subprocess
                
                temp_audio_combined = os.path.join(tempfile.gettempdir(), f"combined_audio_{os.urandom(4).hex()}.wav")
                logger.info("Exporting combined dubbing audio track...")
                final_audio.write_audiofile(temp_audio_combined, fps=44100, verbose=False, logger=None)
                
                cmd = [
                    'ffmpeg', '-y',
                    '-i', video_path,
                    '-i', temp_audio_combined,
                    '-c:v', 'copy',      # Stream copy video - instant!
                    '-c:a', 'aac',       # Audio to AAC
                    '-map', '0:v:0',
                    '-map', '1:a:0',
                    '-shortest',
                    output_path
                ]
                
                logger.info(f"Running high-speed FFmpeg merge: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                
                if result.returncode != 0:
                    logger.error(f"FFmpeg merge failed: {result.stderr}")
                    raise Exception(f"FFmpeg failed: {result.stderr[:200]}")
                
                logger.info("Successfully dubbed video using high-speed FFmpeg copy/merge!")
                
                if os.path.exists(temp_audio_combined):
                    os.remove(temp_audio_combined)
                    
            except Exception as write_error:
                logger.warning(f"High-speed FFmpeg merge failed: {write_error}. Falling back to standard MoviePy write_videofile.")
                # Safe single-threaded fallback to prevent locks
                final_video.write_videofile(
                    output_path,
                    codec='libx264',
                    audio_codec='aac',
                    fps=video.fps if hasattr(video, 'fps') and video.fps else 24,
                    preset='ultrafast',
                    bitrate='2000k',
                    verbose=False,
                    logger=None,
                    threads=1,
                    temp_audiofile=os.path.join(tempfile.gettempdir(), f"temp_audio_{os.urandom(4).hex()}.m4a")
                )
                # Try alternative method - use FFmpeg directly
                try:
                    import subprocess
                    
                    # Export audio first
                    temp_audio_combined = os.path.join(tempfile.gettempdir(), f"combined_audio_{os.urandom(4).hex()}.wav")
                    final_audio.write_audiofile(temp_audio_combined, fps=44100, verbose=False, logger=None)
                    
                    # Use FFmpeg to combine
                    cmd = [
                        'ffmpeg', '-y',
                        '-i', video_path,
                        '-i', temp_audio_combined,
                        '-c:v', 'copy',
                        '-c:a', 'aac',
                        '-map', '0:v:0',
                        '-map', '1:a:0',
                        '-shortest',
                        output_path
                    ]
                    
                    logger.info(f"Trying FFmpeg fallback for video creation")
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                    
                    if result.returncode != 0:
                        logger.error(f"FFmpeg failed: {result.stderr}")
                        raise Exception(f"FFmpeg failed: {result.stderr[:200]}")
                    
                    # Cleanup temp audio
                    if os.path.exists(temp_audio_combined):
                        os.remove(temp_audio_combined)
                        
                except Exception as ffmpeg_error:
                    logger.error(f"FFmpeg fallback also failed: {ffmpeg_error}")
                    raise write_error
            
            # Cleanup
            try:
                final_video.close()
            except:
                pass
            try:
                video.close()
            except:
                pass
            if final_audio:
                try:
                    final_audio.close()
                except:
                    pass
            
            for clip in audio_clips:
                try:
                    clip.close()
                except:
                    pass
            
            for temp_file in temp_audio_files:
                try:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                except:
                    pass
            
            logger.info(f"Dubbed video saved: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error in segment-based dubbing: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise Exception(f"Failed to dub video: {str(e)}")
    
    def dub_video_simple(
        self,
        video_path: str,
        urdu_text: str,
        output_path: Optional[str] = None,
        voice: str = 'female',
        rate: str = '+0%'
    ) -> str:
       
        try:
            logger.info(f"Simple dubbing for video: {video_path}")
            
            if output_path is None:
                temp_dir = tempfile.gettempdir()
                base_name = os.path.basename(video_path)
                name_without_ext = os.path.splitext(base_name)[0]
                output_path = os.path.join(temp_dir, f"dubbed_simple_{name_without_ext}.mp4")
            
            # Ensure .mp4 extension
            if not output_path.lower().endswith('.mp4'):
                output_path = os.path.splitext(output_path)[0] + '.mp4'
            
            logger.info(f"Output path for dubbed video: {output_path}")
            
            # Load video
            video = VideoFileClip(video_path)
            video_duration = video.duration
            
            # Generate Urdu audio
            logger.info(f"Generating Urdu audio for text (length: {len(urdu_text)} chars)")
            urdu_audio_path = self.generate_urdu_audio(urdu_text, voice=voice, rate=rate)
            
            if not os.path.exists(urdu_audio_path):
                raise Exception(f"Urdu audio file was not created: {urdu_audio_path}")
            
            logger.info(f"Loading Urdu audio from: {urdu_audio_path}")
            urdu_audio = AudioFileClip(urdu_audio_path)
            
            # Adjust audio duration to match video
            if urdu_audio.duration > video_duration:
                urdu_audio = urdu_audio.subclip(0, video_duration)
            elif urdu_audio.duration < video_duration:
                # Loop audio if shorter than video
                loops_needed = int(video_duration / urdu_audio.duration) + 1
                urdu_audio = CompositeAudioClip([urdu_audio] * loops_needed).subclip(0, video_duration)
            
            # Replace audio
            final_video = video.set_audio(urdu_audio)
            
            # Ensure output directory exists
            output_dir = os.path.dirname(output_path)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir, exist_ok=True)
            
            # Write video
            logger.info(f"Rendering dubbed video to: {output_path}")
            try:
                # Direct high-speed FFmpeg copy/merge (sub-second rendering, zero deadlocks!)
                import subprocess
                
                temp_audio_combined = os.path.join(tempfile.gettempdir(), f"simple_audio_{os.urandom(4).hex()}.wav")
                logger.info("Exporting simple dubbing audio track...")
                urdu_audio.write_audiofile(temp_audio_combined, fps=44100, verbose=False, logger=None)
                
                cmd = [
                    'ffmpeg', '-y',
                    '-i', video_path,
                    '-i', temp_audio_combined,
                    '-c:v', 'copy',      # Stream copy video - instant!
                    '-c:a', 'aac',       # Audio to AAC
                    '-map', '0:v:0',
                    '-map', '1:a:0',
                    '-shortest',
                    output_path
                ]
                
                logger.info(f"Running simple high-speed FFmpeg merge: {' '.join(cmd)}")
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                
                if result.returncode != 0:
                    logger.error(f"FFmpeg simple merge failed: {result.stderr}")
                    raise Exception(f"FFmpeg failed: {result.stderr[:200]}")
                
                logger.info("Successfully dubbed simple video using high-speed FFmpeg copy/merge!")
                
                if os.path.exists(temp_audio_combined):
                    os.remove(temp_audio_combined)
                    
            except Exception as write_error:
                logger.warning(f"Simple high-speed FFmpeg merge failed: {write_error}. Falling back to standard MoviePy write_videofile.")
                # Safe single-threaded fallback to prevent locks
                final_video.write_videofile(
                    output_path,
                    codec='libx264',
                    audio_codec='aac',
                    fps=video.fps if hasattr(video, 'fps') and video.fps else 24,
                    preset='ultrafast',
                    bitrate='2000k',
                    verbose=False,
                    logger=None,
                    threads=1,
                    temp_audiofile=os.path.join(tempfile.gettempdir(), f"temp_audio_{os.urandom(4).hex()}.m4a")
                )
            
            if not os.path.exists(output_path):
                raise Exception(f"Dubbed video file was not created: {output_path}")
            
            logger.info(f"Successfully created dubbed video: {output_path} ({os.path.getsize(output_path)} bytes)")
            
            # Cleanup
            final_video.close()
            video.close()
            urdu_audio.close()
            try:
                if os.path.exists(urdu_audio_path):
                    os.remove(urdu_audio_path)
            except:
                pass
            
            logger.info(f"Dubbed video saved: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Error in simple dubbing: {e}")
            raise Exception(f"Failed to dub video: {str(e)}")
    
    def dub_video(
        self,
        video_path: str,
        transcription_segments: list,
        output_path: Optional[str] = None,
        voice: str = 'female'
    ) -> str:
        
        try:
            logger.info(f"Dubbing video: {video_path}")
            
            if output_path is None:
                temp_dir = tempfile.gettempdir()
                output_path = os.path.join(
                    temp_dir, 
                    f"dubbed_{os.path.basename(video_path)}"
                )
            
            # Import translator
            from .translator import Translator
            translator = Translator()
            
            # Translate each segment to Urdu in a single batch
            urdu_segments = []
            try:
                for segment in transcription_segments:
                    text = segment.get("text", "").strip()
                    if text:
                        urdu_text = translator.translate_to_urdu(text, unload=False)
                        urdu_segments.append({'text': urdu_text})
                    else:
                        urdu_segments.append({'text': ''})
            finally:
                try:
                    translator.model_loader.unload_model('translation')
                except:
                    pass
            
            # Use segment-based dubbing
            return self.dub_video_with_segments(
                video_path=video_path,
                transcription_segments=transcription_segments,
                urdu_segments=urdu_segments,
                output_path=output_path,
                voice=voice
            )
            
        except Exception as e:
            logger.error(f"Error dubbing video: {e}")
            raise Exception(f"Failed to dub video: {str(e)}")
