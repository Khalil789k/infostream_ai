import os
import logging
import warnings

# Suppress annoying future, deprecation and user warnings from torch/transformers/spaCy/etc.
warnings.filterwarnings("ignore")

# ENFORCE OFFLINE MODE - Prevent AI models from trying to reach HuggingFace
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['HF_DATASETS_OFFLINE'] = '1'
os.environ['NLTK_DATA'] = os.environ.get('NLTK_DATA', '/home/ahmad/nltk_data')

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import get_config
from database import init_db
from api import register_blueprints

def create_app():
    """Application factory for Info Stream AI."""
    config = get_config()
    
    app = Flask(__name__)
    app.config.from_object(config)
    
    # Configure logging to be clean and simple
    logging.basicConfig(
        level=logging.INFO,
        format='[%(levelname)s] %(message)s'
    )
    
    # Setup CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Initialize extensions
    init_db(app)
    jwt = JWTManager(app)
    
    # Register core routes (Blueprints)
    register_blueprints(app)
    
    # Root Welcome Route
    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            'status': 'active',
            'message': 'Info Stream AI Backend API is running successfully!',
            'version': config.APP_VERSION,
            'health_check': '/health'
        }), 200

    # Health check
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({
            'status': 'healthy',
            'app': config.APP_NAME,
            'version': config.APP_VERSION
        }), 200

    # Global Error Handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify(error=str(e.description)), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify(error="Resource not found"), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify(error="Method not allowed"), 405

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify(error="Internal server error"), 500

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    db_name = os.environ.get('DB_NAME', 'infostream_ai')
    db_host = os.environ.get('DB_HOST', 'localhost')
    
    print("\n" + "═"*65)
    print(f" INFO STREAM AI v{app.config['APP_VERSION']}  │  BACKEND SERVERS ENGINE")
    print("═"*65)
    print(f" [STATUS]      Active & Ready")
    print(f" [DATABASE]    PostgreSQL : '{db_name}' on Host: '{db_host}'")
    print(f" [LOCAL URL]   http://localhost:{port}")
    print(f" [NETWORK URL] http://0.0.0.0:{port}")
    print("═"*65)
    print(" Engine is listening... Press CTRL+C to safely shutdown.")
    print("═"*65 + "\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
