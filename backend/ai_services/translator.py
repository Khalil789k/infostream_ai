

from .model_loader import ModelLoader
import sys
import os
from utils.text_cleaner import TextCleaner
from typing import Optional


class Translator:

    
    def __init__(self):
        """Initialize Translator with model loader and text cleaner."""
        self.model_loader = ModelLoader()
        self.text_cleaner = TextCleaner()
    
    def translate_to_urdu(self, text: str, unload: bool = True) -> str:

        if not text or not text.strip():
            return ""
        
        # Preserve original text structure - minimal cleaning
        cleaned_text = text.strip()
        # Normalize whitespace but preserve paragraph breaks
        lines = [line.strip() for line in cleaned_text.split('\n') if line.strip()]
        cleaned_text = '\n'.join(lines)
        
        if len(cleaned_text) < 10:
            return cleaned_text
        
        try:
            # Get translation model
            model_data = self.model_loader.get_model('translation')
            pipeline = model_data['pipeline']
            
            # Split into paragraphs first (preserve context better)
            paragraphs = [p.strip() for p in cleaned_text.split('\n\n') if p.strip()]
            if not paragraphs:
                paragraphs = [cleaned_text]
            
            translated_paragraphs = []
            
            for paragraph in paragraphs:
                if not paragraph or len(paragraph.strip()) < 5:
                    continue
                
                # For each paragraph, translate in optimal chunks
                # Try to translate whole paragraph first (best context)
                word_count = len(paragraph.split())
                
                if word_count <= 100:
                    # Small paragraph - translate directly with better settings
                    try:
                        result = pipeline(
                            paragraph,
                            max_length=512,
                            truncation=True,
                            clean_up_tokenization_spaces=True,
                            num_beams=6,
                            length_penalty=1.2,
                            no_repeat_ngram_size=3
                        )
                        if result and len(result) > 0:
                            translated = result[0].get('translation_text', '')
                            if translated and len(translated.strip()) > 0 and translated.strip() != paragraph.strip():
                                # Clean and normalize the translation
                                translated = self._clean_translation(translated)
                                translated_paragraphs.append(translated.strip())
                            else:
                                # Fallback: try sentence by sentence
                                translated_paragraphs.append(self._translate_sentences(paragraph, pipeline))
                        else:
                            translated_paragraphs.append(self._translate_sentences(paragraph, pipeline))
                    except Exception as e:
                        print(f"Translation error for paragraph: {e}")
                        translated_paragraphs.append(self._translate_sentences(paragraph, pipeline))
                
                elif word_count <= 200:
                    # Medium paragraph - split into 2-3 sentence groups
                    sentences = self.text_cleaner.tokenize_sentences(paragraph)
                    if len(sentences) <= 3:
                        # Small number of sentences - translate together with better settings
                        try:
                            result = pipeline(
                                paragraph, 
                                max_length=512, 
                                truncation=True, 
                                clean_up_tokenization_spaces=True,
                                num_beams=6,
                                length_penalty=1.2,
                                no_repeat_ngram_size=3
                            )
                            if result and len(result) > 0:
                                translated = result[0].get('translation_text', '')
                                if translated and len(translated.strip()) > 0:
                                    translated = self._clean_translation(translated)
                                    translated_paragraphs.append(translated.strip())
                                else:
                                    translated_paragraphs.append(self._translate_sentences(paragraph, pipeline))
                            else:
                                translated_paragraphs.append(self._translate_sentences(paragraph, pipeline))
                        except:
                            translated_paragraphs.append(self._translate_sentences(paragraph, pipeline))
                    else:
                        # Group sentences into chunks of 2-3
                        chunk_size = max(2, len(sentences) // 3)
                        chunk_translations = []
                        for i in range(0, len(sentences), chunk_size):
                            chunk = sentences[i:i + chunk_size]
                            chunk_text = ' '.join(chunk)
                            try:
                                result = pipeline(
                                    chunk_text, 
                                    max_length=512, 
                                    truncation=True, 
                                    clean_up_tokenization_spaces=True,
                                    num_beams=6,
                                    length_penalty=1.2,
                                    no_repeat_ngram_size=3
                                )
                                if result and len(result) > 0:
                                    translated = result[0].get('translation_text', '')
                                    if translated:
                                        translated = self._clean_translation(translated)
                                        chunk_translations.append(translated.strip())
                                    else:
                                        chunk_translations.append(chunk_text)
                                else:
                                    chunk_translations.append(chunk_text)
                            except:
                                chunk_translations.append(chunk_text)
                        translated_paragraphs.append(' '.join(chunk_translations))
                
                else:
                    # Large paragraph - translate in sentence groups
                    translated_paragraphs.append(self._translate_sentences(paragraph, pipeline))
            
            # Join paragraphs with double newlines
            if translated_paragraphs:
                result = '\n\n'.join(translated_paragraphs)
                return result.strip()
            else:
                return cleaned_text  # Fallback
            
        except Exception as e:
            print(f"Translation error: {e}")
            return cleaned_text
        finally:
            if unload:
                try:
                    self.model_loader.unload_model('translation')
                except:
                    pass
    
    def _translate_sentences(self, text: str, pipeline) -> str:

        sentences = self.text_cleaner.tokenize_sentences(text)
        if not sentences:
            return text
        
        translated_sentences = []
        for sentence in sentences:
            if not sentence or len(sentence.strip()) < 3:
                continue
            try:
                result = pipeline(
                    sentence.strip(), 
                    max_length=512, 
                    truncation=True, 
                    clean_up_tokenization_spaces=True,
                    num_beams=6,
                    length_penalty=1.2,
                    no_repeat_ngram_size=3
                )
                if result and len(result) > 0:
                    translated = result[0].get('translation_text', '')
                    if translated and len(translated.strip()) > 0:
                        translated = self._clean_translation(translated)
                        translated_sentences.append(translated.strip())
                    else:
                        translated_sentences.append(sentence.strip())
                else:
                    translated_sentences.append(sentence.strip())
            except:
                translated_sentences.append(sentence.strip())
        
        return ' '.join(translated_sentences) if translated_sentences else text
    
    def _clean_translation(self, text: str) -> str:

        if not text:
            return text
        
        # Remove excessive spaces
        text = ' '.join(text.split())
        
        # Fix common punctuation issues
        text = text.replace(' .', '.')
        text = text.replace(' ,', ',')
        text = text.replace(' !', '!')
        text = text.replace(' ?', '?')
        text = text.replace(' :', ':')
        text = text.replace(' ;', ';')
        
        # Fix spacing around Urdu punctuation (if any)
        text = text.replace(' ،', '،')
        text = text.replace(' ۔', '۔')
        
        # Remove multiple consecutive punctuation marks
        import re
        text = re.sub(r'([.!?])\1+', r'\1', text)
        
        # Ensure proper spacing after punctuation
        text = re.sub(r'([.!?])([^\s])', r'\1 \2', text)
        
        return text.strip()

