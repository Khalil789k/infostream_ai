
import os
from datetime import timedelta
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
 
    
    # Application
    APP_NAME: str = "Info Stream AI"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    TESTING: bool = False
    
    # Database
    DB_USER: str = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD: str = os.getenv('DB_PASSWORD', 'postgres')
    DB_HOST: str = os.getenv('DB_HOST', 'localhost')
    DB_PORT: str = os.getenv('DB_PORT', '5432')
    DB_NAME: str = os.getenv('DB_NAME', 'infostream_ai')
    
    # SQLAlchemy
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ECHO: bool = False  # Log SQL queries
    
    # Connection Pool Settings (Production-ready)
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        'pool_size': 10,           # Number of connections to keep open
        'pool_recycle': 3600,      # Recycle connections after 1 hour
        'pool_pre_ping': True,     # Check connection health before use
        'max_overflow': 20,        # Allow up to 20 additional connections
        'pool_timeout': 30,        # Wait 30s for available connection
    }
    
    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv('JWT_SECRET_KEY', 'change-this-secret-in-production-immediately')
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(days=30)
    JWT_REFRESH_TOKEN_EXPIRES: timedelta = timedelta(days=90)
    JWT_ALGORITHM: str = 'HS256'
    
    # Security
    BCRYPT_LOG_ROUNDS: int = 12
    PASSWORD_MIN_LENGTH: int = 8
    
    # File Upload
    MAX_CONTENT_LENGTH: int = 500 * 1024 * 1024  # 500MB
    UPLOAD_FOLDER: str = os.getenv('UPLOAD_FOLDER', '/tmp/infostream_uploads')
    VIDEO_STORAGE: str = os.getenv('VIDEO_STORAGE', '/tmp/infostream_videos')
    ALLOWED_EXTENSIONS: set = {'pdf', 'doc', 'docx', 'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'}
    
    # AI Models
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    MODEL_DIR: str = os.getenv('MODEL_DIR', os.path.join(BASE_DIR, 'ai_models'))

    
    # Rate Limiting
    RATELIMIT_ENABLED: bool = True
    RATELIMIT_DEFAULT: str = "100/hour"
    
    @classmethod
    def get_database_uri(cls) -> str:
        """Construct and return database URI with fallback options."""
        # 1. Respect explicit env-provided DATABASE_URL if defined
        env_url = os.getenv('DATABASE_URL')
        if env_url:
            # Flask-SQLAlchemy expects postgresql:// instead of postgres://
            if env_url.startswith('postgres://'):
                env_url = env_url.replace('postgres://', 'postgresql://', 1)
            return env_url
            
        # 2. Check if we are running in a containerized host (Hugging Face / Docker) with localhost target
        is_container = os.path.exists('/.dockerenv') or os.getenv('HF_SPACE') or os.getenv('SPACE_ID') or os.getenv('RUNNING_IN_DOCKER') == 'true'
        if is_container and cls.DB_HOST in ('localhost', '127.0.0.1'):
            # SQLite fallback inside the container
            sqlite_path = os.path.join(cls.BASE_DIR, 'infostream_ai.db')
            return f'sqlite:///{sqlite_path}'
            
        return f'postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}'
    
    @classmethod
    def validate(cls) -> bool:
        """Validate critical configuration values."""
        errors = []
        
        if cls.JWT_SECRET_KEY == 'change-this-secret-in-production-immediately':
            errors.append("WARNING: Using default JWT secret key. Set JWT_SECRET_KEY in production!")
        
        if len(cls.JWT_SECRET_KEY) < 32:
            errors.append("WARNING: JWT_SECRET_KEY should be at least 32 characters")
        
        if errors:
            for error in errors:
                print(f"[CONFIG] {error}")
        
        return len(errors) == 0


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG: bool = True
    SQLALCHEMY_ECHO: bool = False  # Disable SQL query logging for clean console
    
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        'pool_size': 5,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
        'max_overflow': 10,
    }


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG: bool = False
    
    # Stricter security in production
    BCRYPT_LOG_ROUNDS: int = 14
    
    # Higher pool settings for production
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        'pool_size': 20,
        'pool_recycle': 1800,      # Recycle every 30 minutes
        'pool_pre_ping': True,
        'max_overflow': 40,
        'pool_timeout': 60,
    }


class TestingConfig(Config):
    """Testing configuration."""
    TESTING: bool = True
    DEBUG: bool = True
    DB_NAME: str = 'infostream_ai_test'
    
    # Minimal pool for testing
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        'pool_size': 2,
        'max_overflow': 5,
    }


def get_config() -> Config:
    """Get configuration based on environment."""
    env = os.getenv('FLASK_ENV', 'development').lower()
    
    config_map = {
        'development': DevelopmentConfig,
        'production': ProductionConfig,
        'testing': TestingConfig,
    }
    
    config_class = config_map.get(env, DevelopmentConfig)
    config_class.validate()
    
    return config_class

