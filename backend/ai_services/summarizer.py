

import logging
from typing import Optional, List, Dict
from .model_loader import ModelLoader
import sys
import os
from utils.text_cleaner import TextCleaner

logger = logging.getLogger(__name__)


class Summarizer:

    
    def __init__(self):
        """Initialize Summarizer with model loader and text cleaner."""
        self.model_loader = ModelLoader()
        self.text_cleaner = TextCleaner()
    
    def _get_target_length(self, word_count: int) -> Dict[str, int]:
        """
        Calculate target summary length (approximately 1/3 of original).
        """
        # Target is 1/3 of original, with reasonable bounds
        target = max(25, word_count // 3)
        
        # For short texts, be more flexible
        if word_count < 150:
            min_len = max(15, int(target * 0.6))
            max_len = min(150, int(target * 1.5))
        elif word_count < 400:
            min_len = max(25, int(target * 0.7))
            max_len = min(250, int(target * 1.4))
        else:
            min_len = max(40, int(target * 0.8))
            max_len = min(512, int(target * 1.3))
        
        return {
            'target': target,
            'min_length': min_len,
            'max_length': max_len
        }
    
    def _summarize_with_model(self, text: str, min_len: int, max_len: int) -> str:
       
        try:
            model_data = self.model_loader.get_model('summarization')
            pipeline = model_data['pipeline']
            
            # Ensure min_len < max_len
            if min_len >= max_len:
                min_len = max(10, max_len - 20)
            
            result = pipeline(
                text,
                max_length=max_len,
                min_length=min_len,
                do_sample=False,
                num_beams=6,                    # Increased beams for better quality (NoteGPT style)
                no_repeat_ngram_size=3,         # Prevent 3-gram repetition
                length_penalty=2.0,             # Better length control
                early_stopping=True,
                truncation=True
            )
            
            if result and result[0].get('summary_text'):
                summary = result[0]['summary_text'].strip()
                # Ensure proper ending
                if summary and not summary.endswith(('.', '!', '?', '"')):
                    summary = summary.rstrip(',;:') + '.'
                return summary
            
            return ""
            
        except Exception as e:
            logger.error(f"Model summarization error: {e}")
            return ""
    
    def _chunk_text(self, text: str, chunk_size: int = 900) -> List[str]:
        """
        Split text into chunks while preserving sentence boundaries.
        """
        sentences = self.text_cleaner.tokenize_sentences(text)
        chunks = []
        current_chunk = []
        current_length = 0
        
        for sentence in sentences:
            sentence_len = len(sentence)
            
            if current_length + sentence_len > chunk_size and current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = [sentence]
                current_length = sentence_len
            else:
                current_chunk.append(sentence)
                current_length += sentence_len
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks
    
    def _summarize_long_text(self, text: str, target_params: Dict[str, int]) -> str:
        """
        Handle long text by chunking and combining summaries.
        """
        chunks = self._chunk_text(text, chunk_size=900)
        
        if len(chunks) == 1:
            return self._summarize_with_model(
                chunks[0],
                target_params['min_length'],
                target_params['max_length']
            )
        
        # Summarize each chunk proportionally
        chunk_summaries = []
        total_chunk_words = sum(len(chunk.split()) for chunk in chunks)
        
        for chunk in chunks:
            chunk_words = len(chunk.split())
            # Proportional target for this chunk
            chunk_proportion = chunk_words / total_chunk_words
            chunk_target = int(target_params['target'] * chunk_proportion)
            chunk_target = max(20, chunk_target)
            
            summary = self._summarize_with_model(
                chunk,
                min_len=max(15, int(chunk_target * 0.7)),
                max_len=min(200, int(chunk_target * 1.5))
            )
            
            if summary:
                chunk_summaries.append(summary)
        
        if not chunk_summaries:
            return ""
        
        # Combine chunk summaries
        combined = ' '.join(chunk_summaries)
        combined_words = len(combined.split())
        
        # If combined is too long, summarize again
        if combined_words > target_params['max_length'] * 1.3:
            return self._summarize_with_model(
                combined,
                target_params['min_length'],
                target_params['max_length']
            )
        
        return combined
    
    def summarize_video(
        self,
        transcription: str,
        segments: Optional[List[Dict]] = None,
        frame_text: Optional[str] = None,
        max_length: Optional[int] = None,
        min_length: Optional[int] = None
    ) -> str:
       
        if not transcription or not transcription.strip():
            return ""
        
        # Combine transcription with frame text for better context
        input_text = transcription
        if frame_text and frame_text.strip():
            input_text = f"--- Screen Content ---\n{frame_text}\n\n--- Audio Transcription ---\n{transcription}"
            
        # Clean and prepare transcription
        cleaned_text = self.text_cleaner.preprocess_for_ai(input_text)
        word_count = len(cleaned_text.split())
        
        if word_count < 30:
            return f"## Summary\n\n{cleaned_text}"
        
        # Calculate target lengths (more comprehensive for videos)
        target_params = self._get_target_length(word_count)
        if max_length:
            target_params['max_length'] = max_length
        if min_length:
            target_params['min_length'] = min_length
        
        logger.info(f"Generating video summary: {word_count} words -> target {target_params['target']} words")
        
        try:
            # Generate main summary
            if len(cleaned_text) > 2000:
                main_summary = self._summarize_long_text(cleaned_text, target_params)
            else:
                main_summary = self._summarize_with_model(
                    cleaned_text,
                    target_params['min_length'],
                    target_params['max_length']
                )
            
            if not main_summary:
                # Fallback
                sentences = self.text_cleaner.tokenize_sentences(cleaned_text)
                num_sentences = max(3, len(sentences) // 3)
                main_summary = ' '.join(sentences[:num_sentences])
            
            # Build NoteGPT-style structured summary
            output_parts = []
            
            # Main Summary Section
            output_parts.append("## Summary\n\n")
            output_parts.append(main_summary.strip())
            output_parts.append("\n\n")
            
            # Key Points Section (extract important points)
            if word_count > 100:
                key_points = self._extract_key_points(cleaned_text, main_summary)
                if key_points:
                    output_parts.append("## Key Points\n\n")
                    for i, point in enumerate(key_points[:5], 1):  # Top 5 key points
                        output_parts.append(f"{i}. {point}\n")
                    output_parts.append("\n")
            
            # Add metadata
            if word_count > 50:
                summary_words = len(main_summary.split())
                ratio = round((summary_words / word_count) * 100)
                output_parts.append("---\n")
                output_parts.append(f"*Original: {word_count} words | Summary: {summary_words} words ({ratio}%)*\n")
            
            return ''.join(output_parts)
            
        except Exception as e:
            logger.error(f"Video summarization error: {e}")
            # Fallback
            sentences = self.text_cleaner.tokenize_sentences(cleaned_text)
            num_sentences = max(3, len(sentences) // 3)
            fallback = ' '.join(sentences[:num_sentences])
            return f"## Summary\n\n{fallback}"
    
    def _extract_key_points(self, text: str, summary: str) -> List[str]:
        """Extract key points from text for structured summary."""
        try:
            # Use summary to identify key sentences
            sentences = self.text_cleaner.tokenize_sentences(text)
            summary_sentences = self.text_cleaner.tokenize_sentences(summary)
            
            # Find sentences that are most relevant
            key_points = []
            for sent in sentences[:10]:  # Check first 10 sentences
                if len(sent.split()) > 10:  # Substantial sentences
                    # Check if sentence relates to summary
                    sent_lower = sent.lower()
                    for sum_sent in summary_sentences:
                        if any(word in sent_lower for word in sum_sent.lower().split()[:5]):
                            if sent not in key_points:
                                key_points.append(sent.strip())
                                break
                
                if len(key_points) >= 5:
                    break
            
            # If not enough, take important sentences
            if len(key_points) < 3:
                important_sentences = [s for s in sentences if len(s.split()) > 15][:5]
                key_points.extend(important_sentences[:5-len(key_points)])
            
            return key_points[:5]
        except:
            return []
    
    def summarize(
        self,
        text: str,
        max_length: Optional[int] = None,
        min_length: Optional[int] = None,
        structured: bool = True
    ) -> str:

        if not text or not text.strip():
            return ""
        
        # Clean text
        cleaned_text = self.text_cleaner.preprocess_for_ai(text)
        word_count = len(cleaned_text.split())
        
        # Very short content - return as-is
        if word_count < 30:
            if structured:
                return f"## Overview\n\n{cleaned_text}"
            return cleaned_text
        
        # Calculate target lengths (1/3 of original)
        target_params = self._get_target_length(word_count)
        
        # Override with user params if provided
        if max_length:
            target_params['max_length'] = max_length
        if min_length:
            target_params['min_length'] = min_length
        
        logger.info(f"Summarizing {word_count} words -> target {target_params['target']} words")
        
        try:
            # Generate summary based on text length
            if len(cleaned_text) > 2000:  # ~400+ words
                raw_summary = self._summarize_long_text(cleaned_text, target_params)
            else:
                raw_summary = self._summarize_with_model(
                    cleaned_text,
                    target_params['min_length'],
                    target_params['max_length']
                )
            
            # Fallback if model failed
            if not raw_summary:
                logger.warning("Model failed, using extractive fallback")
                sentences = self.text_cleaner.tokenize_sentences(cleaned_text)
                num_sentences = max(2, len(sentences) // 3)
                raw_summary = ' '.join(sentences[:num_sentences])
            
            summary_words = len(raw_summary.split())
            logger.info(f"Generated summary: {summary_words} words ({round(summary_words/word_count*100)}%)")
            
            # Format output
            if structured:
                output_parts = []
                output_parts.append("## Overview\n\n")
                output_parts.append(raw_summary)
                
                # Add stats for content
                if word_count > 50:
                    output_parts.append("\n\n---\n")
                    ratio = round((summary_words / word_count) * 100)
                    output_parts.append(f"*Original: {word_count} words | Summary: {summary_words} words ({ratio}%)*")
                
                return ''.join(output_parts)
            else:
                return raw_summary
                
        except Exception as e:
            logger.error(f"Summarization error: {e}")
            sentences = self.text_cleaner.tokenize_sentences(cleaned_text)
            num_sentences = max(2, len(sentences) // 3)
            fallback = ' '.join(sentences[:num_sentences])
            if structured:
                return f"## Overview\n\n{fallback}"
            return fallback
        finally:
            # Always unload model to free up resources as requested
            try:
                self.model_loader.unload_model('summarization')
            except:
                pass
    
    def summarize_simple(self, text: str) -> str:
        """Generate a simple summary without formatting."""
        return self.summarize(text, structured=False)
