

import logging
from typing import List, Optional
import sys
import os
from utils.text_cleaner import TextCleaner
from .model_loader import ModelLoader

logger = logging.getLogger(__name__)


class NotesGenerator:

    
    def __init__(self):
        """Initialize NotesGenerator."""
        self.text_cleaner = TextCleaner()
        self.model_loader = ModelLoader()
    
    def _extract_main_points(self, text: str, num_points: int = 8) -> List[str]:
        """
        Extract main points from text using sentence importance.
        """
        sentences = self.text_cleaner.tokenize_sentences(text)
        if not sentences:
            return []
        
        # Score sentences
        scored = []
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if len(sentence) < 20:
                continue
            
            # Score based on position (first sentences important)
            position_score = 1.0 - (i / len(sentences)) * 0.5
            
            # Score based on length (medium length preferred)
            words = len(sentence.split())
            length_score = min(words / 15, 1.0) if words < 30 else 0.7
            
            # Bonus for sentences with key indicators
            indicator_score = 0
            indicators = ['important', 'key', 'main', 'significant', 'essential', 'crucial']
            if any(ind in sentence.lower() for ind in indicators):
                indicator_score = 0.3
            
            total_score = position_score + length_score + indicator_score
            scored.append((sentence, total_score))
        
        # Sort by score and get top points
        scored.sort(key=lambda x: x[1], reverse=True)
        
        points = []
        for sentence, _ in scored:
            if sentence not in points:
                # Clean up sentence
                if not sentence.endswith('.'):
                    sentence += '.'
                points.append(sentence)
                if len(points) >= num_points:
                    break
        
        return points
    
    def _generate_summary_for_chunk(self, chunk: str, max_words: int = 30) -> str:
        """
        Generate a concise summary for a text chunk.
        """
        try:
            model_data = self.model_loader.get_model('summarization')
            pipeline = model_data['pipeline']
            
            result = pipeline(
                chunk,
                max_length=max_words + 10,
                min_length=max(15, max_words - 10),
                do_sample=False,
                truncation=True
            )
            
            summary = result[0]['summary_text'] if result else ""
            
            if summary and not summary.endswith(('.', '!', '?')):
                summary = summary.rstrip() + '.'
            
            return summary.strip()
            
        except Exception as e:
            logger.error(f"Chunk summarization error: {e}")
            # Fallback to first sentence
            sentences = self.text_cleaner.tokenize_sentences(chunk)
            return sentences[0] if sentences else chunk[:100]
    
    def _create_section_notes(self, text: str, num_notes: int = 6) -> List[str]:
        """
        Create notes by dividing text into sections and summarizing each.
        """
        sentences = self.text_cleaner.tokenize_sentences(text)
        if not sentences:
            return []
        
        # Calculate section size
        section_size = max(3, len(sentences) // num_notes)
        notes = []
        
        for i in range(0, len(sentences), section_size):
            section = sentences[i:i + section_size]
            section_text = ' '.join(section)
            
            if len(section_text.split()) > 20:
                note = self._generate_summary_for_chunk(section_text, max_words=25)
            else:
                note = section_text
            
            if note and len(note) > 15:
                notes.append(note)
            
            if len(notes) >= num_notes:
                break
        
        return notes
    
    def generate_notes(self, text: str) -> str:
        """
        Generate professional, ChatGPT-style study notes.
        
        Args:
            text: Input text content
            
        Returns:
            Formatted, structured study notes
        """
        if not text or not text.strip():
            return ""
        
        cleaned_text = self.text_cleaner.preprocess_for_ai(text)
        word_count = len(cleaned_text.split())
        
        # Very short content
        if word_count < 50:
            return f"## Study Notes\n\n• {cleaned_text}"
        
        try:
            output_parts = []
            output_parts.append("## Study Notes\n")
            
            # Determine note count based on content length
            if word_count < 200:
                num_notes = 4
            elif word_count < 500:
                num_notes = 6
            elif word_count < 1000:
                num_notes = 8
            else:
                num_notes = 10
            
            # Generate section-based notes
            section_notes = self._create_section_notes(cleaned_text, num_notes)
            
            # Key Points Section
            output_parts.append("\n### Key Points\n")
            for i, note in enumerate(section_notes, 1):
                output_parts.append(f"{i}. {note}\n")
            
            # Quick Summary (for longer content)
            if word_count > 300:
                output_parts.append("\n### Quick Summary\n")
                quick_summary = self._generate_summary_for_chunk(
                    cleaned_text[:2000],
                    max_words=50
                )
                output_parts.append(f"{quick_summary}\n")
            
            # Study Tips (for educational content)
            output_parts.append("\n### Remember\n")
            main_points = self._extract_main_points(cleaned_text, num_points=3)
            for point in main_points[:3]:
                # Shorten if too long
                if len(point) > 100:
                    point = point[:97] + "..."
                output_parts.append(f"• {point}\n")
            
            # Stats footer
            output_parts.append(f"\n---\n")
            output_parts.append(f"*{num_notes} key points from {word_count} words*")
            
            return ''.join(output_parts)
            
        except Exception as e:
            logger.error(f"Notes generation error: {e}")
            sentences = self.text_cleaner.tokenize_sentences(cleaned_text)
            notes = []
            step = max(2, len(sentences) // 6)
            for i in range(0, len(sentences), step):
                if len(notes) >= 6: break
                sentence = sentences[i].strip()
                if len(sentence) > 20: notes.append(f"• {sentence}")
            return "## Study Notes\n\n" + '\n'.join(notes)
        finally:
            self.model_loader.unload_model('summarization')
    
    def generate_notes_simple(self, text: str) -> str:
        """
        Generate simple bullet-point notes without sections.
        """
        if not text or not text.strip():
            return ""
        
        cleaned_text = self.text_cleaner.preprocess_for_ai(text)
        
        notes = self._create_section_notes(cleaned_text, num_notes=8)
        
        return '\n'.join([f"• {note}" for note in notes])
