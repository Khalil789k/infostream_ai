

import logging
from typing import List, Dict, Tuple
from .translator import Translator
from .model_loader import ModelLoader

logger = logging.getLogger(__name__)


class CaptionGenerator:
    
    def __init__(self):
        """Initialize CaptionGenerator with translator."""
        self.translator = Translator()
        self.model_loader = ModelLoader()
    
    def generate_captions(
        self, 
        transcription_segments: List[Dict],
        target_language: str = 'urdu'
    ) -> List[Dict[str, any]]:
        """
        Generate captions from transcription segments.
        
        Args:
            transcription_segments: List of segments from Whisper transcription
            target_language: Target language for captions (default: urdu)
            
        Returns:
            List of caption dictionaries with text, start, end times
        """
        try:
            logger.info(f"Generating {target_language} captions from {len(transcription_segments)} segments")
            
            captions = []
            
            for segment in transcription_segments:
                original_text = segment.get("text", "").strip()
                start_time = segment.get("start", 0.0)
                end_time = segment.get("end", 0.0)
                
                if not original_text:
                    continue
                
                # Translate to Urdu
                if target_language.lower() == 'urdu' or target_language.lower() == 'ur':
                    translated_text = self.translator.translate_to_urdu(original_text, unload=False)
                else:
                    translated_text = original_text  # Keep original if not Urdu
                
                captions.append({
                    "text": translated_text,
                    "start": start_time,
                    "end": end_time,
                    "duration": end_time - start_time
                })
            
            logger.info(f"Generated {len(captions)} captions")
            return captions
            
        except Exception as e:
            logger.error(f"Error generating captions: {e}")
            raise Exception(f"Failed to generate captions: {str(e)}")
            
        finally:
            if target_language.lower() == 'urdu' or target_language.lower() == 'ur':
                self.model_loader.unload_model('translation')
    
    def format_srt(self, captions: List[Dict[str, any]]) -> str:
        """
        Format captions as SRT (SubRip) subtitle file format.
        
        Args:
            captions: List of caption dictionaries
            
        Returns:
            SRT formatted string
        """
        srt_content = []
        
        for index, caption in enumerate(captions, start=1):
            start_time = self._format_srt_time(caption["start"])
            end_time = self._format_srt_time(caption["end"])
            text = caption["text"]
            
            srt_content.append(f"{index}")
            srt_content.append(f"{start_time} --> {end_time}")
            srt_content.append(text)
            srt_content.append("")  # Empty line between captions
        
        return "\n".join(srt_content)
    
    def format_vtt(self, captions: List[Dict[str, any]]) -> str:
        """
        Format captions as WebVTT format.
        
        Args:
            captions: List of caption dictionaries
            
        Returns:
            WebVTT formatted string
        """
        vtt_content = ["WEBVTT", ""]
        
        for caption in captions:
            start_time = self._format_vtt_time(caption["start"])
            end_time = self._format_vtt_time(caption["end"])
            text = caption["text"]
            
            vtt_content.append(f"{start_time} --> {end_time}")
            vtt_content.append(text)
            vtt_content.append("")
        
        return "\n".join(vtt_content)
    
    def _format_srt_time(self, seconds: float) -> str:
        """Format time in SRT format (HH:MM:SS,mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        milliseconds = int((seconds % 1) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"
    
    def _format_vtt_time(self, seconds: float) -> str:
        """Format time in WebVTT format (HH:MM:SS.mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        milliseconds = int((seconds % 1) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{milliseconds:03d}"

