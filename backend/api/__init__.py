
from flask import Flask

def register_blueprints(app: Flask):
    """Register all blueprints for the application."""
    from .auth import auth_bp
    from .process import process_bp
    from .documents import documents_bp
    from .video import video_bp
    from .chat import chat_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(process_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(video_bp)
    app.register_blueprint(chat_bp)
