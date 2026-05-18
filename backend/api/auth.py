from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import logging
from datetime import datetime
from models import db, User, ProcessedDocument
from db_utils import create_user, authenticate_user
from database import get_db_manager

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/database/stats', methods=['GET'])
@jwt_required()
def get_database_stats():
    """Get database statistics (admin endpoint)."""
    try:
        db_manager = get_db_manager()
        stats = db_manager.get_stats()
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
    except Exception as e:
        logger.error(f"Error getting database stats: {e}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user."""
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        # Safely extract display name from email if not provided
        if 'displayName' not in data or not data.get('displayName'):
            display_name = email.split('@')[0] if '@' in email else email
        else:
            display_name = data['displayName']
        
        # Validate password length
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Create user using utility function (handles validation)
        new_user = create_user(
            email=email,
            password=password,
            display_name=display_name
        )
        
        # Update photo URL if provided
        if data.get('photoURL'):
            new_user.photo_url = data['photoURL']
            db.session.commit()
        
        # Generate JWT token
        access_token = create_access_token(identity=new_user.id)
        
        logger.info(f"New user registered: {email}")
        
        return jsonify({
            'success': True,
            'user': new_user.to_dict(),
            'token': access_token
        }), 201
        
    except ValueError as e:
        logger.warning(f"Validation error during registration: {e}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error registering user: {e}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    """Login user and return JWT token."""
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        # Authenticate user using utility function
        user = authenticate_user(email, password)
        
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Generate JWT token
        access_token = create_access_token(identity=user.id)
        
        logger.info(f"User logged in: {email}")
        
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'token': access_token
        }), 200
        
    except Exception as e:
        logger.error(f"Error logging in: {e}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/google-login', methods=['POST'])
def google_login():
    """Log in or register user using Google credentials."""
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({'error': 'Email is required'}), 400
        
        email = data['email'].strip().lower()
        display_name = data.get('displayName', email.split('@')[0])
        photo_url = data.get('photoURL', '')
        
        # Check if user already exists
        user = User.query.filter_by(email=email).first()
        if not user:
            # Automatically register them!
            import uuid
            dummy_password = str(uuid.uuid4())
            user = create_user(
                email=email,
                password=dummy_password,
                display_name=display_name
            )
            if photo_url:
                user.photo_url = photo_url
                db.session.commit()
            logger.info(f"New user registered via Google: {email}")
        else:
            # Update photo url if provided
            if photo_url and user.photo_url != photo_url:
                user.photo_url = photo_url
                db.session.commit()
            logger.info(f"User logged in via Google: {email}")
            
        # Generate JWT token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'token': access_token
        }), 200
    except Exception as e:
        logger.error(f"Error in Google login: {e}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile (display name, photo)."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update display name if provided
        if 'displayName' in data:
            user.display_name = data['displayName'].strip()
        
        # Update photo URL if provided
        if 'photoURL' in data:
            user.photo_url = data['photoURL']
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Profile updated for user: {user.email}")
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/user/password', methods=['PUT'])
@jwt_required()
def change_password():
    """Change user password."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if not data or 'currentPassword' not in data or 'newPassword' not in data:
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        current_password = data['currentPassword']
        new_password = data['newPassword']
        
        # Verify current password
        if not user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Validate new password
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        
        # Update password
        user.set_password(new_password)
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Password changed for user: {user.email}")
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/user/stats', methods=['GET'])
@jwt_required()
def get_user_statistics():
    """Get user statistics for profile page."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get document statistics
        documents = ProcessedDocument.query.filter_by(user_id=user_id, is_deleted=False).all()
        
        text_count = len([d for d in documents if d.source_type == 'text'])
        video_count = len([d for d in documents if d.source_type == 'video'])
        url_count = len([d for d in documents if d.source_type == 'url'])
        file_count = len([d for d in documents if d.source_type in ['pdf', 'docx', 'file']])
        
        total_words = sum(len(d.source_text.split()) if d.source_text else 0 for d in documents)
        total_chars = sum(len(d.source_text) if d.source_text else 0 for d in documents)
        
        # Get last activity
        last_doc = ProcessedDocument.query.filter_by(user_id=user_id, is_deleted=False)\
            .order_by(ProcessedDocument.created_at.desc()).first()
        
        return jsonify({
            'success': True,
            'stats': {
                'totalDocuments': len(documents),
                'textDocuments': text_count,
                'videoDocuments': video_count,
                'urlDocuments': url_count,
                'fileDocuments': file_count,
                'totalWords': total_words,
                'totalChars': total_chars,
                'memberSince': user.created_at.isoformat() if user.created_at else None,
                'lastActive': last_doc.created_at.isoformat() if last_doc else user.created_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/user/delete', methods=['DELETE'])
@jwt_required()
def delete_user_account():
    """Delete user account and all associated documents, chats, and messages permanently."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Wipe all user's documents
        ProcessedDocument.query.filter_by(user_id=user_id).delete()
        
        # Wipe all chats (since message has a foreign key to chat, we first delete messages, then chats)
        from models import Chat, Message
        user_chats = Chat.query.filter_by(user_id=user_id).all()
        for chat in user_chats:
            Message.query.filter_by(chat_id=chat.id).delete()
        Chat.query.filter_by(user_id=user_id).delete()
        
        # Finally delete user
        db.session.delete(user)
        db.session.commit()
        
        logger.info(f"User account {user_id} and all related records deleted successfully")
        return jsonify({
            'success': True,
            'message': 'Account and all associated data permanently deleted'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting user account: {e}")
        return jsonify({'error': str(e)}), 500
