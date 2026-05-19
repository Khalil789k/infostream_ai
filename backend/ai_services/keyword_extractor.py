

import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from rake_nltk import Rake
import sys
import os
from utils.text_cleaner import TextCleaner
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)


class KeywordExtractor:

    
    def __init__(self):
        """Initialize KeywordExtractor with text cleaner."""
        self.text_cleaner = TextCleaner()
        self.rake = Rake()
    
    def extract_keywords_tfidf(self, text: str, top_k: int = 10) -> List[Tuple[str, float]]:
        """
        Extract keywords using TF-IDF method with scores.
        """
        if not text or len(text.strip()) < 50:
            return []
        
        try:
            cleaned_text = self.text_cleaner.clean_text(text)
            sentences = self.text_cleaner.tokenize_sentences(cleaned_text)
            
            if not sentences:
                return []
            
            vectorizer = TfidfVectorizer(
                max_features=top_k * 2,
                stop_words='english',
                ngram_range=(1, 2),
                min_df=1
            )
            
            tfidf_matrix = vectorizer.fit_transform(sentences)
            feature_names = vectorizer.get_feature_names_out()
            
            scores = tfidf_matrix.sum(axis=0).A1
            top_indices = scores.argsort()[-top_k:][::-1]
            keywords = [(feature_names[idx], scores[idx]) for idx in top_indices]
            
            return keywords[:top_k]
            
        except Exception as e:
            logger.error(f"TF-IDF extraction error: {e}")
            return []
    
    def extract_keywords_rake(self, text: str, top_k: int = 10) -> List[Tuple[str, float]]:
        """
        Extract keywords using RAKE method with scores.
        """
        if not text or len(text.strip()) < 50:
            return []
        
        try:
            cleaned_text = self.text_cleaner.clean_text(text)
            self.rake.extract_keywords_from_text(cleaned_text)
            keywords_with_scores = self.rake.get_ranked_phrases_with_scores()
            
            return [(phrase, score) for score, phrase in keywords_with_scores[:top_k]]
            
        except Exception as e:
            logger.error(f"RAKE extraction error: {e}")
            return []
    
    def _categorize_keywords(self, keywords: List[str]) -> Dict[str, List[str]]:
        """
        Categorize keywords into Main Topics and Related Terms.
        """
        main_topics = []
        related_terms = []
        
        for kw in keywords:
            words = kw.split()
            # Multi-word phrases are usually main topics
            if len(words) >= 2 or kw[0].isupper():
                main_topics.append(kw)
            else:
                related_terms.append(kw)
        
        # Ensure we have balanced categories
        if not main_topics and related_terms:
            main_topics = related_terms[:len(related_terms)//2]
            related_terms = related_terms[len(related_terms)//2:]
        
        return {
            'main_topics': main_topics[:8],
            'related_terms': related_terms[:8]
        }
    
    def _filter_redundant(self, keywords: List[str]) -> List[str]:
        """
        Remove redundant and overlapping keywords.
        """
        seen = set()
        filtered = []
        
        for kw in keywords:
            kw_lower = kw.lower().strip()
            if len(kw_lower) < 2 or kw_lower in seen:
                continue
            
            # Check for overlaps
            is_redundant = False
            for existing in filtered:
                existing_lower = existing.lower()
                if kw_lower in existing_lower or existing_lower in kw_lower:
                    is_redundant = True
                    break
            
            if not is_redundant:
                seen.add(kw_lower)
                filtered.append(kw)
        
        return filtered
    
    def extract_keywords(self, text: str, top_k: int = 15, method: str = 'combined') -> str:
        """
        Extract keywords and format in ChatGPT-style output.
        
        Args:
            text: Input text
            top_k: Number of keywords to return
            method: 'tfidf', 'rake', or 'combined'
            
        Returns:
            Formatted, structured keywords string
        """
        keywords = []
        
        if method in ('tfidf', 'combined'):
            tfidf_results = self.extract_keywords_tfidf(text, top_k=top_k)
            keywords.extend([kw for kw, _ in tfidf_results])
        
        if method in ('rake', 'combined'):
            rake_results = self.extract_keywords_rake(text, top_k=top_k)
            keywords.extend([kw for kw, _ in rake_results])
        
        # Filter and deduplicate
        unique_keywords = self._filter_redundant(keywords)[:top_k]
        
        if not unique_keywords:
            return "No keywords extracted"
        
        # Categorize keywords
        categories = self._categorize_keywords(unique_keywords)
        
        # Format output
        output_parts = []
        
        output_parts.append("## Keywords & Topics\n")
        
        # Main Topics
        if categories['main_topics']:
            output_parts.append("### Main Topics\n")
            for topic in categories['main_topics']:
                # Capitalize first letter of each word
                formatted = topic.title() if len(topic.split()) > 1 else topic.capitalize()
                output_parts.append(f"• {formatted}\n")
        
        # Related Terms  
        if categories['related_terms']:
            output_parts.append("\n### Related Terms\n")
            for term in categories['related_terms']:
                output_parts.append(f"• {term.capitalize()}\n")
        
        # All keywords as tags
        output_parts.append("\n### All Tags\n")
        tags = [f"`{kw}`" for kw in unique_keywords[:12]]
        output_parts.append(' '.join(tags))
        
        return ''.join(output_parts)
    
    def extract_keywords_simple(self, text: str, top_k: int = 10) -> str:
        """
        Extract keywords as simple comma-separated list.
        """
        keywords = []
        
        tfidf_results = self.extract_keywords_tfidf(text, top_k=top_k//2)
        keywords.extend([kw for kw, _ in tfidf_results])
        
        rake_results = self.extract_keywords_rake(text, top_k=top_k//2)
        keywords.extend([kw for kw, _ in rake_results])
        
        unique = self._filter_redundant(keywords)[:top_k]
        
        return ', '.join(unique) if unique else "No keywords extracted"
