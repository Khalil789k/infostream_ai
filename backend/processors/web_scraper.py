

import requests
from bs4 import BeautifulSoup
from newspaper import Article
from typing import Optional
import re


class WebScraper:

    
    def __init__(self):
        """Initialize WebScraper with default settings."""
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    
    def extract_text(self, url: str) -> str:

        if not url or not isinstance(url, str):
            raise ValueError("Invalid URL provided")
        
        # Validate URL format
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        text_content = None
        
        # Try Newspaper3k first (better for articles)
        try:
            article = Article(url)
            article.download()
            article.parse()
            
            if article.text and len(article.text.strip()) > 100:
                text_content = article.text.strip()
        except Exception as e:
            print(f"Newspaper3k extraction failed: {e}, trying BeautifulSoup...")
        
        # Fallback to BeautifulSoup
        if not text_content:
            try:
                response = requests.get(url, headers=self.headers, timeout=30)  # Increased timeout for longer pages
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style", "meta", "link", "nav", "header", "footer", "aside"]):
                    script.decompose()
                
                # Extract text from main content areas (prioritize semantic HTML5 elements)
                main_content = (soup.find('main') or 
                               soup.find('article') or 
                               soup.find('div', class_=re.compile('content|article|post|main|body', re.I)) or
                               soup.find('section'))
                
                if main_content:
                    text_content = main_content.get_text(separator='\n', strip=True)
                else:
                    # Fallback to body but exclude navigation and footer
                    body = soup.find('body')
                    if body:
                        # Remove common non-content elements
                        for elem in body.find_all(['nav', 'header', 'footer', 'aside', 'script', 'style']):
                            elem.decompose()
                        text_content = body.get_text(separator='\n', strip=True)
                    else:
                        text_content = soup.get_text(separator='\n', strip=True)
                
                # Clean up text - remove excessive whitespace and empty lines
                lines = [line.strip() for line in text_content.split('\n') if line.strip() and len(line.strip()) > 3]
                text_content = '\n\n'.join(lines)
                
            except Exception as e:
                raise Exception(f"Failed to extract text from URL: {str(e)}")
        
        if not text_content or len(text_content.strip()) < 50:
            raise Exception("Insufficient text content extracted from URL")
        
        return text_content.strip()

