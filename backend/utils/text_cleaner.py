

import re
import spacy
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.stem import WordNetLemmatizer
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


# Required NLTK data - Ensure these are manually downloaded or placed in nltk_data folder
# To download manually:
# import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('averaged_perceptron_tagger')

def _check_nltk_data():
    """Verify NLTK data exists without downloading."""
    required = ['tokenizers/punkt', 'corpora/stopwords', 'corpora/wordnet', 'taggers/averaged_perceptron_tagger']
    for data in required:
        try:
            nltk.data.find(data)
        except LookupError:
            logger.warning(f"NLTK data '{data}' not found. Some text cleaning features may fail. "
                           "Please run 'python download_models.py' to download all required dependencies.")

_check_nltk_data()

class TextCleaner:
    """Professional text cleaner with zero-download policy."""
    _nlp_shared = None
    _nlp_attempted = False
    
    def __init__(self):
        """Initialize TextCleaner with spaCy model and NLTK components."""
        # Use shared class variable to load spaCy model exactly once
        if not TextCleaner._nlp_attempted:
            TextCleaner._nlp_attempted = True
            try:
                # Only try to load if model exists locally
                TextCleaner._nlp_shared = spacy.load("en_core_web_sm")
                logger.info("spaCy English model loaded successfully")
            except (OSError, ImportError):
                logger.warning("spaCy English model 'en_core_web_sm' not found. Entity extraction will be disabled.")
                TextCleaner._nlp_shared = None
        
        self.nlp = TextCleaner._nlp_shared
        
        try:
            self.stop_words = set(stopwords.words('english'))
        except (LookupError, AttributeError):
            logger.warning("NLTK stopwords not found. Using empty set.")
            self.stop_words = set()
            
        try:
            self.lemmatizer = WordNetLemmatizer()
        except (LookupError, AttributeError):
            logger.warning("NLTK lemmatizer not found. Lemmatization will be disabled.")
            self.lemmatizer = None

    
    def clean_text(self, text: str, remove_stopwords: bool = False) -> str:

        if not text or not isinstance(text, str):
            return ""
        
        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', '', text)
        
        # Remove extra whitespace and newlines
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n\n', text)
        
        # Remove special characters but keep essential punctuation
        text = re.sub(r'[^\w\s\.\,\!\?\;\:\-\(\)\"\']', ' ', text)
        
        # Remove multiple consecutive punctuation
        text = re.sub(r'([\.\,\!\?\;\:])\1+', r'\1', text)
        
        # Normalize whitespace
        text = ' '.join(text.split())
        
        # Remove very short words (likely noise)
        if remove_stopwords:
            tokens = word_tokenize(text.lower())
            tokens = [token for token in tokens if token not in self.stop_words and len(token) > 1]
            text = ' '.join(tokens)
        
        return text.strip()
    
    def tokenize_sentences(self, text: str) -> List[str]:

        if not text:
            return []
        
        sentences = sent_tokenize(text)
        return [s.strip() for s in sentences if s.strip()]
    
    def tokenize_words(self, text: str, remove_stopwords: bool = True) -> List[str]:

        if not text:
            return []
        
        tokens = word_tokenize(text.lower())
        
        if remove_stopwords:
            tokens = [token for token in tokens if token not in self.stop_words and token.isalnum()]
        
        return tokens
    
    def lemmatize_text(self, text: str) -> str:

        if not text:
            return ""
        
        tokens = word_tokenize(text)
        lemmatized = [self.lemmatizer.lemmatize(token) for token in tokens]
        return ' '.join(lemmatized)
    
    def extract_entities(self, text: str) -> List[str]:

        if not text:
            return []
        
        if self.nlp is None:
            # spaCy not available, return empty list
            return []
        
        try:
            doc = self.nlp(text)
            entities = [ent.text for ent in doc.ents]
            return list(set(entities))  # Remove duplicates
        except Exception:
            # If extraction fails, return empty list
            return []
    
    def preprocess_for_ai(self, text: str, max_length: Optional[int] = None) -> str:

        if not text:
            return ""
        
        # Clean text thoroughly
        cleaned = self.clean_text(text, remove_stopwords=False)
        
        # Truncate intelligently at sentence boundaries if needed
        if max_length and len(cleaned) > max_length:
            # Use token-based truncation for better model compatibility
            sentences = self.tokenize_sentences(cleaned)
            truncated = []
            current_length = 0
            
            for sentence in sentences:
                sentence_length = len(sentence.split())  # Approximate token count
                if current_length + sentence_length <= max_length:
                    truncated.append(sentence)
                    current_length += sentence_length
                else:
                    # Try to add partial sentence if space allows
                    remaining = max_length - current_length
                    if remaining > 20:  # Only if meaningful space remains
                        words = sentence.split()[:remaining]
                        if words:
                            truncated.append(' '.join(words) + '...')
                    break
            
            cleaned = ' '.join(truncated)
            if not cleaned:
                # Last resort: character-based truncation
                cleaned = text[:max_length * 4]  # Approximate char to token ratio
        
        return cleaned.strip()

    def split_segments_into_sentences(self, segments: List[dict]) -> List[dict]:
        """Split multi-sentence Whisper segments into individual sentence-level segments."""
        if not segments:
            return []
        
        sentence_segments = []
        for seg in segments:
            text = seg.get("text", "").strip()
            start = seg.get("start", 0.0)
            end = seg.get("end", 0.0)
            duration = end - start
            
            if not text:
                continue
            
            sentences = self.tokenize_sentences(text)
            
            if len(sentences) <= 1:
                sentence_segments.append(seg)
                continue
            
            total_chars = sum(len(s) for s in sentences)
            if total_chars <= 0:
                sentence_segments.append(seg)
                continue
            
            current_start = start
            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue
                
                sentence_len = len(sentence)
                sentence_duration = (sentence_len / total_chars) * duration
                current_end = current_start + sentence_duration
                
                new_seg = seg.copy()
                new_seg.update({
                    "text": sentence,
                    "start": round(current_start, 2),
                    "end": round(current_end, 2)
                })
                sentence_segments.append(new_seg)
                current_start = current_end
                
        return sentence_segments


