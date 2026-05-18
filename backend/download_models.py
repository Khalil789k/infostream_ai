import os
import logging
import shutil
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from sentence_transformers import SentenceTransformer
import whisper

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_huggingface_model_exists(directory):
    """Check if the huggingface model is already fully downloaded in the directory."""
    if not os.path.exists(directory):
        return False
    
    # Needs to have at least config.json and some model weights
    has_config = os.path.exists(os.path.join(directory, 'config.json'))
    has_weights = (os.path.exists(os.path.join(directory, 'model.safetensors')) or 
                   os.path.exists(os.path.join(directory, 'pytorch_model.bin')))
    
    return has_config and has_weights

def check_sentence_transformer_exists(directory):
    """Check if the sentence transformer model is fully downloaded."""
    if not os.path.exists(directory):
        return False
    
    # SentenceTransformers has config_sentence_transformers.json and modules.json
    has_config = os.path.exists(os.path.join(directory, 'config_sentence_transformers.json'))
    has_modules = os.path.exists(os.path.join(directory, 'modules.json'))
    has_weights = (os.path.exists(os.path.join(directory, 'model.safetensors')) or 
                   os.path.exists(os.path.join(directory, 'pytorch_model.bin')))
    
    return has_config and has_modules and has_weights

def check_whisper_exists(directory, model_name):
    """Check if whisper model is already downloaded."""
    expected_file = os.path.join(directory, f"{model_name}.pt")
    return os.path.exists(expected_file)

def clean_directory(directory):
    """Remove the directory completely to allow a clean install if an error occurs."""
    if os.path.exists(directory):
        logger.warning(f"Cleaning up incomplete directory: {directory}")
        shutil.rmtree(directory)

def download_models():
    """
    Downloads all required models to the local ai_models directory.
    Includes resume/skip logic to avoid re-downloading.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, 'ai_models')
    
    os.makedirs(models_dir, exist_ok=True)
    
    # ---------------------------------------------------------
    # 1. Summarization Model
    # ---------------------------------------------------------
    summarization_dir = os.path.join(models_dir, 'summarization')
    summarization_model_name = "facebook/bart-large-cnn" 
    
    if check_huggingface_model_exists(summarization_dir):
        logger.info(f"[SKIP] Summarization model already exists at {summarization_dir}")
    else:
        try:
            logger.info(f"Downloading Summarization model ({summarization_model_name}) to {summarization_dir}...")
            clean_directory(summarization_dir)
            os.makedirs(summarization_dir, exist_ok=True)
            tokenizer = AutoTokenizer.from_pretrained(summarization_model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(summarization_model_name)
            tokenizer.save_pretrained(summarization_dir)
            model.save_pretrained(summarization_dir)
            logger.info("Summarization model downloaded successfully!\n")
        except Exception as e:
            logger.error(f"Error downloading Summarization model: {e}")
            clean_directory(summarization_dir)

    # ---------------------------------------------------------
    # 2. Translation Model (English to Urdu)
    # ---------------------------------------------------------
    translation_dir = os.path.join(models_dir, 'translation')
    translation_model_name = "Helsinki-NLP/opus-mt-en-ur"
    
    if check_huggingface_model_exists(translation_dir):
        logger.info(f"[SKIP] Translation model already exists at {translation_dir}")
    else:
        try:
            logger.info(f"Downloading Translation model ({translation_model_name}) to {translation_dir}...")
            clean_directory(translation_dir)
            os.makedirs(translation_dir, exist_ok=True)
            tokenizer = AutoTokenizer.from_pretrained(translation_model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(translation_model_name)
            tokenizer.save_pretrained(translation_dir)
            model.save_pretrained(translation_dir)
            logger.info("Translation model downloaded successfully!\n")
        except Exception as e:
            logger.error(f"Error downloading Translation model: {e}")
            clean_directory(translation_dir)

    # ---------------------------------------------------------
    # 3. Embedding Model
    # ---------------------------------------------------------
    embedding_dir = os.path.join(models_dir, 'embedding')
    embedding_model_name = "all-MiniLM-L6-v2"
    
    if check_sentence_transformer_exists(embedding_dir):
        logger.info(f"[SKIP] Embedding model already exists at {embedding_dir}")
    else:
        try:
            logger.info(f"Downloading Embedding model ({embedding_model_name}) to {embedding_dir}...")
            clean_directory(embedding_dir)
            os.makedirs(embedding_dir, exist_ok=True)
            embed_model = SentenceTransformer(embedding_model_name)
            embed_model.save(embedding_dir)
            logger.info("Embedding model downloaded successfully!\n")
        except Exception as e:
            logger.error(f"Error downloading Embedding model: {e}")
            clean_directory(embedding_dir)

    # ---------------------------------------------------------
    # 4. Whisper Model
    # ---------------------------------------------------------
    whisper_dir = os.path.join(models_dir, 'whisper')
    whisper_model_name = "base"
    
    if check_whisper_exists(whisper_dir, whisper_model_name):
        logger.info(f"[SKIP] Whisper model '{whisper_model_name}' already exists at {whisper_dir}")
    else:
        try:
            logger.info(f"Downloading Whisper model ({whisper_model_name}) to {whisper_dir}...")
            os.makedirs(whisper_dir, exist_ok=True)
            whisper.load_model(whisper_model_name, download_root=whisper_dir, device="cpu")
            logger.info("Whisper model downloaded successfully!\n")
        except Exception as e:
            logger.error(f"Error downloading Whisper model: {e}")
            # The whisper model downloads a single file like base.pt. If it fails, we remove it.
            pt_path = os.path.join(whisper_dir, f"{whisper_model_name}.pt")
            if os.path.exists(pt_path):
                os.remove(pt_path)

    # ---------------------------------------------------------
    # 5. NLTK Data
    # ---------------------------------------------------------
    try:
        import nltk
        logger.info("Downloading NLTK data (punkt, stopwords, wordnet, averaged_perceptron_tagger)...")
        nltk.download('punkt')
        nltk.download('stopwords')
        nltk.download('wordnet')
        nltk.download('averaged_perceptron_tagger')
        logger.info("NLTK data downloaded successfully!\n")
    except Exception as e:
        logger.error(f"Error downloading NLTK data: {e}")

    logger.info(f"Script execution finished. Target directory: {models_dir}")

if __name__ == "__main__":
    download_models()
