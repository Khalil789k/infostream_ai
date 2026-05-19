
import torch
import os
import logging
import numpy as np
from transformers import (
    AutoTokenizer, 
    AutoModelForSeq2SeqLM,
    pipeline
)
from sentence_transformers import SentenceTransformer
import sys

# Add backend to path to import config
# This assumes model_loader is in backend/ai_services/
try:
    from config import get_config
except ImportError:
    # Fallback for direct script execution or different structure
    class MockConfig:
        MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ai_models')
    def get_config(): return MockConfig()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockPipeline:
    """Mock Transformers Pipeline for development without downloaded models."""
    def __init__(self, task):
        self.task = task
        logger.info(f"Initialized MockPipeline for task: {task}")
        
    def __call__(self, text, *args, **kwargs):
        if self.task == "summarization":
            # Return a simple mock summary
            preview = (text[:50] + "...") if len(text) > 50 else text
            preview = preview.replace('\n', ' ')
            return [{'summary_text': f"[MOCK SUMMARY] This is a mock summary of the content starting with: {preview}"}]
        
        elif self.task == "translation":
            # Return a simple mock translation
            preview = (text[:50] + "...") if len(text) > 50 else text
            preview = preview.replace('\n', ' ')
            # Note: This is English placeholder text, in reality it should be Urdu
            return [{'translation_text': f"[MOCK URDU] (Urdu Placeholder) Translated content: {preview}"}]
            
        return []

class MockEmbeddingModel:
    """Mock SentenceTransformer for development."""
    def __init__(self, model_name):
        self.model_name = model_name
        logger.info(f"Initialized MockEmbeddingModel: {model_name}")
        
    def encode(self, sentences, *args, **kwargs):
        # all-MiniLM-L6-v2 has dimension 384
        dimension = 384
        if isinstance(sentences, str):
            return np.random.rand(dimension).astype('float32')
        return np.random.rand(len(sentences), dimension).astype('float32')

class ModelLoader:
    _instance = None
    _models = {}
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize ModelLoader (only runs once due to singleton pattern)."""
        if not self._initialized:
            self._initialized = True
            try:
                self.config = get_config()
                self.model_dir = getattr(self.config, 'MODEL_DIR', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ai_models'))
            except:
                self.model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ai_models')
            
            # Ensure model_dir exists
            if not os.path.exists(self.model_dir):
                os.makedirs(self.model_dir, exist_ok=True)
                
            logger.info(f"Initializing ModelLoader (Model Path: {self.model_dir})")
    
    def _get_local_path(self, model_type: str) -> str:
        """Get the expected path for a specific model type."""
        return os.path.join(self.model_dir, model_type)

    def load_summarization_model(self):
        """Load local summarization model or fallback to Mock."""
        if 'summarization' not in self._models:
            local_path = self._get_local_path('summarization')
            
            # Check if directory exists and contains some model files (tokenizer or config)
            if os.path.exists(local_path) and os.path.isdir(local_path) and os.path.exists(os.path.join(local_path, 'config.json')):
                logger.info(f"Loading local summarization model from {local_path}...")
                try:
                    import gc
                    gc.collect()
                    tokenizer = AutoTokenizer.from_pretrained(local_path, local_files_only=True)
                    model = AutoModelForSeq2SeqLM.from_pretrained(local_path, local_files_only=True)
                    
                    self._models['summarization'] = {
                        'tokenizer': tokenizer,
                        'model': model,
                        'pipeline': pipeline(
                            "summarization",
                            model=model,
                            tokenizer=tokenizer,
                            device=0 if torch.cuda.is_available() else -1
                        )
                    }
                    logger.info("Local summarization model loaded successfully")
                except Exception as e:
                    logger.error(f"Error loading local summarization model: {e}")
                    self._setup_mock_summarizer()
            else:
                if not os.path.exists(local_path):
                    logger.warning(f"Summarization model directory not found at {local_path}. Using Mock.")
                else:
                    logger.warning(f"Summarization model directory {local_path} exists but config.json missing. Using Mock.")
                self._setup_mock_summarizer()
        
        return self._models['summarization']

    def _setup_mock_summarizer(self):
        self._models['summarization'] = {
            'tokenizer': None,
            'model': None,
            'pipeline': MockPipeline("summarization")
        }

    def load_translation_model(self):
        """Load local translation model or fallback to Mock."""
        if 'translation' not in self._models:
            local_path = self._get_local_path('translation')
            
            if os.path.exists(local_path) and os.path.isdir(local_path) and os.path.exists(os.path.join(local_path, 'config.json')):
                logger.info(f"Loading local translation model from {local_path}...")
                try:
                    tokenizer = AutoTokenizer.from_pretrained(local_path, local_files_only=True)
                    model = AutoModelForSeq2SeqLM.from_pretrained(local_path, local_files_only=True)
                    
                    translation_pipeline = pipeline(
                        "translation",
                        model=model,
                        tokenizer=tokenizer,
                        device=0 if torch.cuda.is_available() else -1,
                        num_beams=6,
                        early_stopping=True,
                        length_penalty=1.2,
                        no_repeat_ngram_size=3,
                        do_sample=False
                    )
                    
                    self._models['translation'] = {
                        'tokenizer': tokenizer,
                        'model': model,
                        'pipeline': translation_pipeline
                    }
                    logger.info("Local translation model loaded successfully")
                except Exception as e:
                    logger.error(f"Error loading local translation model: {e}")
                    self._setup_mock_translator()
            else:
                logger.warning(f"Translation model folder {local_path} invalid or missing. Using Mock.")
                self._setup_mock_translator()
        
        return self._models['translation']

    def _setup_mock_translator(self):
        self._models['translation'] = {
            'tokenizer': None,
            'model': None,
            'pipeline': MockPipeline("translation")
        }

    def load_embedding_model(self):
        """Load local embedding model or fallback to Mock."""
        if 'embedding' not in self._models:
            local_path = self._get_local_path('embedding')
            
            # SentenceTransformers folders usually have config_sentence_transformers.json or similar
            if os.path.exists(local_path) and os.path.isdir(local_path) and os.path.exists(os.path.join(local_path, 'modules.json')):
                logger.info(f"Loading local embedding model from {local_path}...")
                try:
                    model = SentenceTransformer(local_path, device='cuda' if torch.cuda.is_available() else 'cpu', local_files_only=True)
                    self._models['embedding'] = model
                    logger.info("Local embedding model loaded successfully")
                except Exception as e:
                    logger.error(f"Error loading local embedding model: {e}")
                    self._setup_mock_embedding()
            else:
                logger.warning(f"Embedding model folder {local_path} invalid or missing. Using Mock.")
                self._setup_mock_embedding()
        
        return self._models['embedding']

    def _setup_mock_embedding(self):
        self._models['embedding'] = MockEmbeddingModel("all-MiniLM-L6-v2")

    def get_model(self, model_type: str):
        """Get a cached model by type."""
        if model_type not in self._models:
            if model_type == 'summarization':
                return self.load_summarization_model()
            elif model_type == 'translation':
                return self.load_translation_model()
            elif model_type == 'embedding':
                return self.load_embedding_model()
            else:
                raise ValueError(f"Unknown model type: {model_type}")
        
        return self._models[model_type]
    
    def unload_model(self, model_type: str):
        """Unload a model to free up memory/GPU resources."""
        if model_type in self._models:
            logger.info(f"Unloading model: {model_type}")
            # Delete the model and clear cache
            del self._models[model_type]
            
            # Force garbage collection and CUDA cache clear
            import gc
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            return True
        return False

    def clear_cache(self):
        """Clear all loaded models."""
        logger.info("Clearing all loaded models from memory...")
        self._models.clear()
        import gc
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    
    def preload_all_models(self):
        """Preload all models at startup."""
        logger.info("Preloading all AI models (Local/Mock)...")
        try:
            self.load_summarization_model()
            self.load_translation_model()
            self.load_embedding_model()
            logger.info("All models preloaded successfully")
        except Exception as e:
            logger.error(f"Error during preloading: {e}")
