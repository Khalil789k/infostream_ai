import logging
from typing import Dict
from processors.pdf_processor import PDFProcessor
from processors.doc_processor import DocProcessor
from processors.web_scraper import WebScraper
from processors.video_processor import VideoProcessor
from processors.video_url_processor import get_video_url_processor
from ai_services.summarizer import Summarizer
from ai_services.keyword_extractor import KeywordExtractor
from ai_services.notes_generator import NotesGenerator
from ai_services.translator import Translator
from ai_services.chatbot import Chatbot
from ai_services.model_loader import ModelLoader
from ai_services.caption_generator import CaptionGenerator
from ai_services.voice_dubber import VoiceDubber

logger = logging.getLogger(__name__)

# Initialize processors
pdf_processor = PDFProcessor()
doc_processor = DocProcessor()
web_scraper = WebScraper()
video_processor = VideoProcessor()

try:
    video_url_processor = get_video_url_processor()
except Exception as e:
    logger.error(f"Error initializing VideoURLProcessor: {e}")
    video_url_processor = None

# Initialize AI services
summarizer = Summarizer()
keyword_extractor = KeywordExtractor()
notes_generator = NotesGenerator()
translator = Translator()
chatbot = Chatbot()
caption_generator = CaptionGenerator()
voice_dubber = VoiceDubber()

# Store active chatbot sessions
chatbot_sessions: Dict[str, Chatbot] = {}
