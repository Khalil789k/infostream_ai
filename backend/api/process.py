from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import os
import uuid
from urllib.parse import urlparse
from werkzeug.utils import secure_filename
from models import db, ProcessedDocument, SourceType
from db_utils import create_document
from .services import (
    pdf_processor, doc_processor, web_scraper, video_processor, 
    video_url_processor, summarizer, keyword_extractor, notes_generator, translator
)

logger = logging.getLogger(__name__)
process_bp = Blueprint('process', __name__)

# Task runner functions (run inside the background thread)
def run_process_document(user_id, file_bytes, filename):
    from models import db, ProcessedDocument
    from api.services import pdf_processor, doc_processor
    
    file_ext = filename.rsplit('.', 1)[1].lower()
    if file_ext == 'pdf':
        text = pdf_processor.extract_text(file_bytes=file_bytes)
        source_type = 'pdf'
    else:
        text = doc_processor.extract_text(file_bytes=file_bytes)
        source_type = 'docx'
    
    if not text or len(text.strip()) < 10:
        raise ValueError("No readable text found")
        
    processed_doc = ProcessedDocument(
        user_id=user_id,
        title=filename.rsplit('.', 1)[0],
        source_type=source_type,
        source_text=text,
        file_name=filename
    )
    db.session.add(processed_doc)
    db.session.commit()
    
    return {
        'id': processed_doc.id,
        'title': processed_doc.title,
        'text': text
    }

def run_process_video(user_id, file_bytes, filename, video_id):
    from models import db, ProcessedDocument
    from api.services import video_processor
    import os
    
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
    
    return {
        'id': processed_doc.id,
        'title': processed_doc.title,
        'videoId': video_id
    }

def run_process_url(user_id, url):
    from models import db, ProcessedDocument
    from api.services import video_url_processor, video_processor, web_scraper
    from urllib.parse import urlparse
    import uuid
    import os
    
    is_video = video_url_processor.is_video_url(url) if video_url_processor else False
    
    if is_video:
        video_storage = current_app.config['VIDEO_STORAGE']
        video_result = video_url_processor.process_video_url(url, video_processor, video_storage)
        
        video_id = video_result['download_info'].get('video_id', str(uuid.uuid4()))
        filename = os.path.basename(video_result['video_path'])
        
        processed_doc = ProcessedDocument(
            user_id=user_id,
            title=video_result.get('title', 'Video'),
            source_type='video',
            source_text=video_result['combined_text'],
            frame_text=video_result.get('frame_text'),
            source_url=url,
            file_name=filename,
            video_id=video_id,
            original_video_url=f"/api/video/original/{video_id}/{filename}",
            video_duration=video_result.get('video_duration', 0),
            transcription_segments=video_result.get('segments', [])
        )
        db.session.add(processed_doc)
        db.session.commit()
        return {'id': processed_doc.id, 'isVideo': True}
    else:
        text = web_scraper.extract_text(url)
        if not text or len(text.strip()) < 10:
            raise ValueError("Insufficient content on web page")
            
        title = urlparse(url).netloc.replace('www.', '') or 'Web Content'
        processed_doc = ProcessedDocument(
            user_id=user_id, title=title, source_type='url', source_text=text, source_url=url
        )
        db.session.add(processed_doc)
        db.session.commit()
        return {'id': processed_doc.id, 'isVideo': False}

def run_process_all_features(user_id, document_id):
    from models import db, ProcessedDocument
    from api.services import summarizer, keyword_extractor, notes_generator
    
    document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
    if not document:
        raise ValueError("Document not found")
        
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
    
    return {
        'summary': document.summary,
        'keywords': document.keywords,
        'notes': document.notes
    }

def run_process_document_summary(user_id, document_id):
    from models import db, ProcessedDocument
    from api.services import summarizer
    
    document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
    if not document:
        raise ValueError("Document not found")
        
    if document.summary:
        return {'summary': document.summary, 'cached': True}
        
    if document.source_type == 'video':
        audio_text = document.source_text
        if "Audio Transcription:" in document.source_text:
            audio_text = document.source_text.split("Audio Transcription:")[1].split("Text from Video Frames:")[0].strip()
        summary = summarizer.summarize_video(audio_text, frame_text=document.frame_text)
    else:
        summary = summarizer.summarize(document.source_text)
        
    document.summary = summary
    db.session.commit()
    return {'summary': summary, 'cached': False}

def run_process_document_keywords(user_id, document_id):
    from models import db, ProcessedDocument
    from api.services import keyword_extractor
    
    document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
    if not document:
        raise ValueError("Document not found")
        
    if document.keywords:
        return {'keywords': document.keywords, 'cached': True}
        
    keywords = keyword_extractor.extract_keywords(document.source_text)
    document.keywords = keywords
    db.session.commit()
    return {'keywords': keywords, 'cached': False}

def run_process_document_notes(user_id, document_id):
    from models import db, ProcessedDocument
    from api.services import notes_generator
    
    document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
    if not document:
        raise ValueError("Document not found")
        
    if document.notes:
        return {'notes': document.notes, 'cached': True}
        
    notes = notes_generator.generate_notes(document.source_text)
    document.notes = notes
    db.session.commit()
    return {'notes': notes, 'cached': False}

def run_translate(user_id, text, target_language, document_id):
    from models import db, ProcessedDocument
    from api.services import translator
    
    if target_language.lower() == 'urdu':
        translated_text = translator.translate_to_urdu(text)
    else:
        translated_text = f"[Translation to {target_language}] {text}"
        
    if document_id:
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
        if document:
            document.translated_text = translated_text
            db.session.commit()
            
    return {'translatedText': translated_text}

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'pdf', 'doc', 'docx', 'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'}

def is_video_file(filename: str) -> bool:
    """Check if file is a video file."""
    video_extensions = {'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in video_extensions

# New Queue Management Endpoints
@process_bp.route('/api/process/queue/status/<task_id>', methods=['GET'])
@jwt_required()
def get_task_status(task_id):
    """Get the status and queue position of a task."""
    from queue_manager import ProcessingQueueManager
    status_info = ProcessingQueueManager().get_task_status(task_id)
    if not status_info:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(status_info), 200

@process_bp.route('/api/process/queue/cancel/<task_id>', methods=['POST'])
@jwt_required()
def cancel_task(task_id):
    """Cancel a queued or running task."""
    from queue_manager import ProcessingQueueManager
    success = ProcessingQueueManager().cancel_task(task_id)
    return jsonify({'success': success}), 200

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

@process_bp.route('/api/documents/<document_id>/process/summary', methods=['POST'])
@jwt_required()
def process_document_summary(document_id):
    """Queue generation of document summary on-demand."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
        if not document: return jsonify({'error': 'Document not found'}), 404
        if document.summary: return jsonify({'success': True, 'summary': document.summary, 'cached': True}), 200
        
        from queue_manager import ProcessingQueueManager
        task_id = ProcessingQueueManager().add_task(
            user_id, 'summary', run_process_document_summary, user_id, document_id
        )
        
        return jsonify({
            'success': True,
            'queued': True,
            'taskId': task_id
        }), 202
    except Exception as e:
        logger.error(f"Error queuing summary: {e}")
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/documents/<document_id>/process/keywords', methods=['POST'])
@jwt_required()
def process_document_keywords(document_id):
    """Queue generation of document keywords on-demand."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
        if not document: return jsonify({'error': 'Document not found'}), 404
        if document.keywords: return jsonify({'success': True, 'keywords': document.keywords, 'cached': True}), 200
        
        from queue_manager import ProcessingQueueManager
        task_id = ProcessingQueueManager().add_task(
            user_id, 'keywords', run_process_document_keywords, user_id, document_id
        )
        
        return jsonify({
            'success': True,
            'queued': True,
            'taskId': task_id
        }), 202
    except Exception as e:
        logger.error(f"Error queuing keywords: {e}")
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/documents/<document_id>/process/notes', methods=['POST'])
@jwt_required()
def process_document_notes(document_id):
    """Queue generation of document notes on-demand."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
        if not document: return jsonify({'error': 'Document not found'}), 404
        if document.notes: return jsonify({'success': True, 'notes': document.notes, 'cached': True}), 200
        
        from queue_manager import ProcessingQueueManager
        task_id = ProcessingQueueManager().add_task(
            user_id, 'notes', run_process_document_notes, user_id, document_id
        )
        
        return jsonify({
            'success': True,
            'queued': True,
            'taskId': task_id
        }), 202
    except Exception as e:
        logger.error(f"Error queuing notes: {e}")
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/documents/<document_id>/process/all', methods=['POST'])
@jwt_required()
def process_document_all(document_id):
    """Queue generation of all features (summary, keywords, notes)."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
        if not document: 
            return jsonify({'error': 'Document not found'}), 404
        
        if document.summary and document.keywords and document.notes:
            return jsonify({
                'success': True,
                'summary': document.summary,
                'keywords': document.keywords,
                'notes': document.notes,
                'cached': True
            }), 200
            
        from queue_manager import ProcessingQueueManager
        task_id = ProcessingQueueManager().add_task(
            user_id, 'all_features', run_process_all_features, user_id, document_id
        )
        
        return jsonify({
            'success': True,
            'queued': True,
            'taskId': task_id
        }), 202
    except Exception as e:
        logger.error(f"Error queuing all features: {e}")
        return jsonify({'error': str(e)}), 500

@process_bp.route('/api/translate', methods=['POST'])
@jwt_required()
def translate():
    """Queue translation to target language."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
            
        text = data['text']
        target_language = data.get('targetLanguage', 'Urdu')
        document_id = data.get('documentId')
        
        if document_id:
            document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id).first()
            if document and document.translated_text:
                return jsonify({
                    'success': True,
                    'translatedText': document.translated_text,
                    'cached': True
                }), 200
                
        from queue_manager import ProcessingQueueManager
        task_id = ProcessingQueueManager().add_task(
            user_id, 'translation', run_translate, user_id, text, target_language, document_id
        )
        
        return jsonify({
            'success': True,
            'queued': True,
            'taskId': task_id
        }), 202
    except Exception as e:
        logger.error(f"Error queuing translation: {e}")
        return jsonify({'error': str(e)}), 500

from urllib.parse import urlparse
