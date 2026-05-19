# pyrefly: ignore [missing-import]
from flask import Blueprint, request, jsonify, send_file, Response, current_app
# pyrefly: ignore [missing-import]
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
import logging
import os
import mimetypes
from models import db, ProcessedDocument
from .services import video_processor, voice_dubber, caption_generator, translator

logger = logging.getLogger(__name__)
video_bp = Blueprint('video', __name__)

def _serve_video_range(video_path: str, mime_type: str, range_header: str):
    """Serve video with range request support for seeking."""
    import re
    file_size = os.path.getsize(video_path)
    match = re.search(r'bytes=(\d*)-(\d*)', range_header)
    if not match: return send_file(video_path, mimetype=mime_type)
    
    start = int(match.group(1)) if match.group(1) else 0
    end = int(match.group(2)) if match.group(2) else file_size - 1
    if start >= file_size: return Response(status=416)
    
    end = min(end, file_size - 1)
    content_length = end - start + 1
    
    def generate():
        with open(video_path, 'rb') as f:
            f.seek(start)
            remaining = content_length
            while remaining:
                chunk = f.read(min(8192, remaining))
                if not chunk: break
                remaining -= len(chunk)
                yield chunk
    
    response = Response(generate(), 206)
    response.headers.add('Content-Range', f'bytes {start}-{end}/{file_size}')
    response.headers.add('Accept-Ranges', 'bytes')
    response.headers.add('Content-Length', str(content_length))
    response.headers.add('Content-Type', mime_type)
    return response

@video_bp.route('/api/video/original/<video_id>/<filename>', methods=['GET'])
def get_original_video(video_id, filename):
    """Serve original video file."""
    try:
        token = request.args.get('token') or request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token: return jsonify({'error': 'Unauthorized'}), 401
        try: decode_token(token)
        except: return jsonify({'error': 'Invalid token'}), 401
        
        video_storage = current_app.config['VIDEO_STORAGE']
        possible_paths = [
            os.path.join(video_storage, f"{video_id}_{filename}"),
            os.path.join(video_storage, filename),
            os.path.join(video_storage, f"video_{video_id}_{filename}"),
        ]
        
        video_path = next((p for p in possible_paths if os.path.exists(p)), None)
        if not video_path: return jsonify({'error': 'Not found'}), 404
        
        mime_type = mimetypes.guess_type(video_path)[0] or 'video/mp4'
        range_header = request.headers.get('Range')
        if range_header: return _serve_video_range(video_path, mime_type, range_header)
        return send_file(video_path, mimetype=mime_type)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@video_bp.route('/api/video/dubbed/<video_id>/<path:filename>', methods=['GET'])
def get_dubbed_video(video_id, filename):
    """Serve dubbed video file."""
    try:
        token = request.args.get('token') or request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token: return jsonify({'error': 'Unauthorized'}), 401
        try: decode_token(token)
        except: return jsonify({'error': 'Invalid token'}), 401
        
        video_storage = current_app.config['VIDEO_STORAGE']
        possible_paths = [
            os.path.join(video_storage, filename),
            os.path.join(video_storage, f"dubbed_{video_id}_{filename}"),
            os.path.join(video_storage, f"dubbed_{video_id}.mp4"),
        ]
        
        video_path = next((p for p in possible_paths if os.path.exists(p)), None)
        if not video_path: return jsonify({'error': 'Not found'}), 404
        
        mime_type = mimetypes.guess_type(video_path)[0] or 'video/mp4'
        range_header = request.headers.get('Range')
        if range_header: return _serve_video_range(video_path, mime_type, range_header)
        return send_file(video_path, mimetype=mime_type)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def run_dub_video(user_id, document_id, voice):
    from models import db, ProcessedDocument
    from api.services import voice_dubber, video_processor
    from utils.text_cleaner import TextCleaner
    import os
    
    document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id, is_deleted=False).first()
    if not document or document.source_type != 'video':
        raise ValueError("Invalid document for dubbing")
        
    if document.dubbed_video_url:
        return {'dubbedVideoUrl': document.dubbed_video_url}
        
    video_storage = current_app.config['VIDEO_STORAGE']
    
    # Robust path resolution - try multiple naming patterns
    possible_paths = [
        os.path.join(video_storage, f"{document.video_id}_{document.file_name}"),
        os.path.join(video_storage, document.file_name),
        os.path.join(video_storage, f"video_{document.video_id}_{document.file_name}"),
        os.path.join(video_storage, f"video_{document.file_name}") if not document.file_name.startswith('video_') else None,
    ]
    original_video_path = next((p for p in possible_paths if p and os.path.exists(p)), None)
    
    if not original_video_path:
        raise ValueError("Original video file missing")
        
    segments = document.transcription_segments
    if not segments:
        video_result = video_processor.process_video(original_video_path)
        segments = video_result.get('segments', [])
        if segments:
            document.transcription_segments = segments
            db.session.commit()
            
    if not segments:
        raise ValueError("No transcription segments found")
        
    # Split segments into sentences for fine-grained sentence-by-sentence dubbing
    try:
        segments = TextCleaner().split_segments_into_sentences(segments)
    except Exception as e:
        logger.error(f"Error splitting dubbing segments: {e}")
        
    dubbed_filename = f"dubbed_{document.video_id}_{document.file_name}"
    voice_dubber.dub_video(original_video_path, segments, os.path.join(video_storage, dubbed_filename), voice)
    
    document.dubbed_video_url = f"/api/video/dubbed/{document.video_id}/{dubbed_filename}"
    db.session.commit()
    return {'dubbedVideoUrl': document.dubbed_video_url}

@video_bp.route('/api/video/<document_id>/dub', methods=['POST'])
@jwt_required()
def dub_video(document_id):
    """Queue video dubbing."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id, is_deleted=False).first()
        if not document or document.source_type != 'video': 
            return jsonify({'error': 'Invalid document'}), 400
        
        if document.dubbed_video_url:
            return jsonify({'success': True, 'dubbedVideoUrl': document.dubbed_video_url}), 200
            
        voice = (request.get_json() or {}).get('voice', 'female')
        
        from queue_manager import ProcessingQueueManager
        task_id = ProcessingQueueManager().add_task(
            user_id, 'dubbing', run_dub_video, user_id, document_id, voice
        )
        
        return jsonify({
            'success': True,
            'queued': True,
            'taskId': task_id
        }), 202
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error queuing dubbing: {e}")
        return jsonify({'error': str(e)}), 500

def run_get_video_captions(user_id, document_id):
    from models import db, ProcessedDocument
    from api.services import video_processor, caption_generator
    from utils.text_cleaner import TextCleaner
    import os
    
    document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id, is_deleted=False).first()
    if not document or document.source_type != 'video':
        raise ValueError("Invalid document")
        
    video_storage = current_app.config['VIDEO_STORAGE']
    possible_paths = [
        os.path.join(video_storage, f"{document.video_id}_{document.file_name}"),
        os.path.join(video_storage, document.file_name),
        os.path.join(video_storage, f"video_{document.video_id}_{document.file_name}"),
        os.path.join(video_storage, f"video_{document.file_name}") if not document.file_name.startswith('video_') else None,
    ]
    original_video_path = next((p for p in possible_paths if p and os.path.exists(p)), None)
    if not original_video_path:
        raise ValueError("Original file missing")
        
    segments = document.transcription_segments
    if not segments:
        video_result = video_processor.process_video(original_video_path)
        segments = video_result.get('segments', [])
        if segments:
            document.transcription_segments = segments
            db.session.commit()
            
    try:
        segments = TextCleaner().split_segments_into_sentences(segments)
    except Exception as e:
        logger.error(f"Error splitting captions segments: {e}")
        
    urdu_captions = caption_generator.generate_captions(segments, target_language='urdu')
    return {
        'captions': urdu_captions,
        'captionsSrt': caption_generator.format_srt(urdu_captions),
        'captionsVtt': caption_generator.format_vtt(urdu_captions)
    }

@video_bp.route('/api/video/<document_id>/captions', methods=['GET'])
@jwt_required()
def get_video_captions(document_id):
    """Queue Urdu captions generation."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id, is_deleted=False).first()
        if not document or document.source_type != 'video': return jsonify({'error': 'Invalid document'}), 400
        
        from queue_manager import ProcessingQueueManager
        task_id = ProcessingQueueManager().add_task(
            user_id, 'captions', run_get_video_captions, user_id, document_id
        )
        
        return jsonify({
            'success': True,
            'queued': True,
            'taskId': task_id
        }), 202
    except Exception as e:
        logger.error(f"Error queuing captions: {e}")
        return jsonify({'error': str(e)}), 500

@video_bp.route('/api/video/<document_id>/transcription', methods=['GET'])
@jwt_required()
def get_video_transcription(document_id):
    """Get transcription."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id, is_deleted=False).first()
        if not document: return jsonify({'error': 'Not found'}), 404
        
        urdu_trans = document.translated_text
        if not urdu_trans and document.source_text:
            urdu_trans = translator.translate_to_urdu(document.source_text)
            document.translated_text = urdu_trans
            db.session.commit()
            
        return jsonify({'success': True, 'transcription': document.source_text, 'urduTranscription': urdu_trans or ''}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def process_video_url_internal(user_id: str, url: str):
    """Internal function to process video URL. Called from process blueprint."""
    from .services import video_url_processor, video_processor
    import uuid
    from models import ProcessedDocument
    
    try:
        video_storage = current_app.config['VIDEO_STORAGE']
        video_result = video_url_processor.process_video_url(url, video_processor, video_storage)
        
        video_id = video_result['download_info'].get('video_id', str(uuid.uuid4()))
        filename = os.path.basename(video_result['video_path'])
        
        document = ProcessedDocument(
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
        db.session.add(document)
        db.session.commit()
        
        return jsonify({'success': True, 'isVideo': True, 'id': document.id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
