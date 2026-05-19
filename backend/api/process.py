from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import os
import uuid
from werkzeug.utils import secure_filename
from models import db, ProcessedDocument, SourceType
from db_utils import create_document
from .services import (
    pdf_processor, doc_processor, web_scraper, video_processor, 
    video_url_processor, summarizer, keyword_extractor, notes_generator, translator
)

logger = logging.getLogger(__name__)
process_bp = Blueprint('process', __name__)

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'pdf', 'doc', 'docx', 'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'}

def is_video_file(filename: str) -> bool:
    """Check if file is a video file."""
    video_extensions = {'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in video_extensions

@process_bp.route('/api/process/text', methods=['POST'])
@jwt_required()
def process_text():
    """Save text input to database WITHOUT processing."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Text content is required'}), 400
        
        text = data['text']
        title = data.get('title', 'Untitled')
        
        if not text or len(text.strip()) < 10:
            return jsonify({'error': 'Text must be at least 10 characters'}), 400
        
        if len(title) > 200:
            title = title[:200]
        
        logger.info(f"Saving text for user {user_id}: {title} ({len(text)} chars)")
        
        processed_doc = create_document(
            user_id=user_id,
            title=title,
            source_type=SourceType.TEXT.value,
            source_text=text
        )
        
        return jsonify({
            'success': True,
            'title': title,
            'id': processed_doc.id
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving text: {e}")
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/process/document', methods=['POST'])
@jwt_required()
def process_document():
    """Process uploaded document (PDF or DOCX)."""
    try:
        user_id = get_jwt_identity()
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '' or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file'}), 400
        
        file_bytes = file.read()
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.', 1)[1].lower()
        
        if file_ext == 'pdf':
            text = pdf_processor.extract_text(file_bytes=file_bytes)
            source_type = 'pdf'
        else:
            text = doc_processor.extract_text(file_bytes=file_bytes)
            source_type = 'docx'
        
        if not text or len(text.strip()) < 10:
            return jsonify({'error': 'No readable text found'}), 400
        
        processed_doc = ProcessedDocument(
            user_id=user_id,
            title=filename.rsplit('.', 1)[0],
            source_type=source_type,
            source_text=text,
            file_name=filename
        )
        db.session.add(processed_doc)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'text': text,
            'title': processed_doc.title,
            'id': processed_doc.id
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing document: {e}")
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/process/video', methods=['POST'])
@jwt_required()
def process_video():
    """Process uploaded video file."""
    try:
        user_id = get_jwt_identity()
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '' or not is_video_file(file.filename):
            return jsonify({'error': 'Invalid video file'}), 400
        
        file_bytes = file.read()
        filename = secure_filename(file.filename)
        video_id = str(uuid.uuid4())
        
        video_storage = current_app.config['VIDEO_STORAGE']
        os.makedirs(video_storage, exist_ok=True)
        original_video_path = os.path.join(video_storage, f"{video_id}_{filename}")
        
        with open(original_video_path, 'wb') as f:
            f.write(file_bytes)
        
        video_result = video_processor.process_video_from_bytes(file_bytes, filename)
        
        processed_doc = ProcessedDocument(
            user_id=user_id,
            title=filename.rsplit('.', 1)[0],
            source_type='video',
            source_text=video_result['audio_transcription'],
            frame_text=video_result.get('frame_text'),
            file_name=filename,
            video_id=video_id,
            original_video_url=f"/api/video/original/{video_id}/{filename}",
            video_duration=video_result.get('video_duration', 0),
            transcription_segments=video_result.get('segments', [])
        )
        db.session.add(processed_doc)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'title': processed_doc.title,
            'id': processed_doc.id,
            'videoId': video_id
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing video: {e}")
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/process/url', methods=['POST'])
@jwt_required()
def process_url():
    """Process web or video URL."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        url = data.get('url')
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        is_video = video_url_processor.is_video_url(url) if video_url_processor else False
        
        if is_video:
            # Import here to avoid circular dependency if any, but since we are in blueprint it should be fine
            from .video import process_video_url_internal
            return process_video_url_internal(user_id, url)
        
        text = web_scraper.extract_text(url)
        if not text or len(text.strip()) < 10:
            return jsonify({'error': 'Insufficient content'}), 400
        
        title = urlparse(url).netloc.replace('www.', '') or 'Web Content'
        processed_doc = ProcessedDocument(
            user_id=user_id, title=title, source_type='url', source_text=text, source_url=url
        )
        db.session.add(processed_doc)
        db.session.commit()
        
        return jsonify({'success': True, 'id': processed_doc.id, 'isVideo': False}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing URL: {e}")
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/documents/<document_id>/process/summary', methods=['POST'])
@jwt_required()
def process_document_summary(document_id):
    """Generate summary for a document on-demand."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
        if not document: return jsonify({'error': 'Document not found'}), 404
        if document.summary: return jsonify({'success': True, 'summary': document.summary, 'cached': True}), 200
        
        if document.source_type == 'video':
            audio_text = document.source_text
            if "Audio Transcription:" in document.source_text:
                audio_text = document.source_text.split("Audio Transcription:")[1].split("Text from Video Frames:")[0].strip()
            summary = summarizer.summarize_video(audio_text, frame_text=document.frame_text)
        else:
            summary = summarizer.summarize(document.source_text)
            
        document.summary = summary
        db.session.commit()
        return jsonify({'success': True, 'summary': summary, 'cached': False}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error summary: {e}")
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/documents/<document_id>/process/keywords', methods=['POST'])
@jwt_required()
def process_document_keywords(document_id):
    """Generate keywords for a document on-demand."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
        if not document: return jsonify({'error': 'Document not found'}), 404
        if document.keywords: return jsonify({'success': True, 'keywords': document.keywords, 'cached': True}), 200
        
        keywords = keyword_extractor.extract_keywords(document.source_text)
        document.keywords = keywords
        db.session.commit()
        return jsonify({'success': True, 'keywords': keywords, 'cached': False}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/documents/<document_id>/process/notes', methods=['POST'])
@jwt_required()
def process_document_notes(document_id):
    """Generate notes for a document on-demand."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
        if not document: return jsonify({'error': 'Document not found'}), 404
        if document.notes: return jsonify({'success': True, 'notes': document.notes, 'cached': True}), 200
        
        notes = notes_generator.generate_notes(document.source_text)
        document.notes = notes
        db.session.commit()
        return jsonify({'success': True, 'notes': notes, 'cached': False}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/documents/<document_id>/process/all', methods=['POST'])
@jwt_required()
def process_document_all(document_id):
    """Generate all (summary, keywords, notes) for a document on-demand."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
        if not document: return jsonify({'error': 'Document not found'}), 404
        
        if not document.summary:
            if document.source_type == 'video':
                audio_text = document.source_text
                if "Audio Transcription:" in document.source_text:
                    audio_text = document.source_text.split("Audio Transcription:")[1].split("Text from Video Frames:")[0].strip()
                document.summary = summarizer.summarize_video(audio_text, frame_text=document.frame_text)
            else:
                document.summary = summarizer.summarize(document.source_text)
        if not document.keywords:
            document.keywords = keyword_extractor.extract_keywords(document.source_text)
        if not document.notes:
            document.notes = notes_generator.generate_notes(document.source_text)
        
        db.session.commit()
        return jsonify({'success': True, 'summary': document.summary, 'keywords': document.keywords, 'notes': document.notes}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/translate', methods=['POST'])
@jwt_required()
def translate():
    """Translate text to target language."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
            
        text = data['text']
        target_language = data.get('targetLanguage', 'Urdu')
        document_id = data.get('documentId')
        
        # Currently we primarily support Urdu translation via our AI service
        if target_language.lower() == 'urdu':
            translated_text = translator.translate_to_urdu(text)
        else:
            # Fallback for other languages
            translated_text = f"[Translation to {target_language}] {text}"
            
        # If documentId is provided, update the document with translated text
        if document_id:
            document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
            if document:
                document.translated_text = translated_text
                db.session.commit()
                
        return jsonify({
            'success': True,
            'translatedText': translated_text
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Translation error: {e}")
        return jsonify({'error': str(e)}), 500

from urllib.parse import urlparse
