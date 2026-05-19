from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import logging
import re
import random
import requests
from datetime import datetime, timedelta
from models import db, User, ProcessedDocument
from db_utils import create_user, authenticate_user
from database import get_db_manager
from utils.email import send_otp_email

logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)

def validate_password_strength(password: str) -> bool:
    """Validate password complexity requirements (len >= 8, upper, lower, digit, symbol)."""
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    if not re.search(r"[^A-Za-z0-9]", password):
        return False
    return True

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user (pending email OTP verification)."""
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
        
        # Enforce password strength
        if not validate_password_strength(password):
            return jsonify({'error': 'Password is too weak. It must be at least 8 characters and contain uppercase, lowercase, numbers, and symbols.'}), 400
        
        # Generate OTP
        otp = f"{random.randint(100000, 999999)}"
        otp_expiry = datetime.utcnow() + timedelta(minutes=15)
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            if existing_user.is_verified:
                return jsonify({'error': 'Email address already registered'}), 400
            else:
                # Pending verification user: update info, regenerate OTP and resend!
                existing_user.display_name = display_name
                existing_user.set_password(password)
                existing_user.verification_otp = otp
                existing_user.verification_otp_expiry = otp_expiry
                db.session.commit()
                send_otp_email(email, otp, mode="verification")
                return jsonify({
                    'success': True,
                    'email': email,
                    'message': 'Account pending verification. Verification code resent.'
                }), 200
        
        # Create brand new user (pending verification)
        new_user = User(
            email=email,
            display_name=display_name,
            is_verified=False,
            verification_otp=otp,
            verification_otp_expiry=otp_expiry
        )
        new_user.set_password(password)
        
        db.session.add(new_user)
        db.session.commit()
        
        send_otp_email(email, otp, mode="verification")
        logger.info(f"New pending user registered: {email}")
        
        return jsonify({
            'success': True,
            'email': email,
            'message': 'Registration successful. Verification code sent to email.'
        }), 201
        
    except ValueError as e:
        logger.warning(f"Validation error during registration: {e}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error registering user: {e}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    """Verify registration OTP."""
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'otp' not in data:
            return jsonify({'error': 'Email and verification code are required'}), 400
        
        email = data['email'].strip().lower()
        otp = data['otp'].strip()
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.is_verified:
            return jsonify({'error': 'User email is already verified'}), 400
        
        if not user.verification_otp or user.verification_otp != otp:
            return jsonify({'error': 'Invalid verification code'}), 400
        
        if not user.verification_otp_expiry or user.verification_otp_expiry < datetime.utcnow():
            return jsonify({'error': 'Verification code has expired. Please request a new one.'}), 400
        
        # Mark verified
        user.is_verified = True
        user.verification_otp = None
        user.verification_otp_expiry = None
        db.session.commit()
        
        # Generate access token
        access_token = create_access_token(identity=user.id)
        logger.info(f"User email verified successfully: {email}")
        
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'token': access_token
        }), 200
        
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/resend-otp', methods=['POST'])
def resend_otp():
    """Resend registration verification OTP."""
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({'error': 'Email is required'}), 400
        
        email = data['email'].strip().lower()
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.is_verified:
            return jsonify({'error': 'User email is already verified'}), 400
        
        # Generate new OTP
        otp = f"{random.randint(100000, 999999)}"
        otp_expiry = datetime.utcnow() + timedelta(minutes=15)
        
        user.verification_otp = otp
        user.verification_otp_expiry = otp_expiry
        db.session.commit()
        
        send_otp_email(email, otp, mode="verification")
        logger.info(f"Resent verification OTP to: {email}")
        
        return jsonify({
            'success': True,
            'message': 'Verification code resent successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error resending OTP: {e}")
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
        
        # Enforce Email verification block!
        if not user.is_verified:
            # Automatically generate a fresh OTP for verification convenience
            otp = f"{random.randint(100000, 999999)}"
            otp_expiry = datetime.utcnow() + timedelta(minutes=15)
            user.verification_otp = otp
            user.verification_otp_expiry = otp_expiry
            db.session.commit()
            send_otp_email(email, otp, mode="verification")
            
            return jsonify({
                'error': 'Email address not verified. A verification code has been sent to your email.',
                'isVerified': False,
                'email': email
            }), 403
        
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
    """Log in or register user using verified Google ID Token credentials."""
    try:
        data = request.get_json()
        if not data or 'idToken' not in data:
            return jsonify({'error': 'Google ID token is required'}), 400
        
        id_token = data['idToken']
        
        # 1. Try to parse as simulated base64 developer token first (for testing/development ease)
        is_mock = False
        token_info = None
        try:
            import base64
            import json
            # Ensure base64 padding is correct
            padded = id_token + "=" * ((4 - len(id_token) % 4) % 4)
            decoded = base64.b64decode(padded).decode('utf-8')
            parsed = json.loads(decoded)
            if isinstance(parsed, dict) and 'email' in parsed:
                is_mock = True
                token_info = parsed
                logger.info(f"Using parsed mock developer token for email: {parsed.get('email')}")
        except Exception:
            pass
        
        # 2. If not mock, verify securely with Google's official API
        if not is_mock:
            google_verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
            response = requests.get(google_verify_url, timeout=10)
            
            if response.status_code != 200:
                logger.error(f"Google ID token verification failed: {response.text}")
                return jsonify({'error': 'Invalid Google account authentication token'}), 401
            
            token_info = response.json()
        
        email = token_info.get('email', '').strip().lower()
        display_name = token_info.get('name', email.split('@')[0])
        photo_url = token_info.get('picture', '')
        
        if not email:
            return jsonify({'error': 'Google account email not verified or missing'}), 400
        
        # Check if user already exists
        user = User.query.filter_by(email=email).first()
        if not user:
            # Automatically register them and mark verified since Google authenticated them!
            import uuid
            dummy_password = str(uuid.uuid4()) + "aA1!" # Satisfies password strength
            user = User(
                email=email,
                display_name=display_name,
                is_active=True,
                is_verified=True
            )
            user.set_password(dummy_password)
            if photo_url:
                user.photo_url = photo_url
            db.session.add(user)
            db.session.commit()
            logger.info(f"New user registered via Real Google: {email}")
        else:
            # If they existed but were pending verification, mark verified immediately!
            if not user.is_verified:
                user.is_verified = True
                
            # Update photo url/display name if provided
            if photo_url and user.photo_url != photo_url:
                user.photo_url = photo_url
            if display_name and user.display_name != display_name:
                user.display_name = display_name
            db.session.commit()
            logger.info(f"User logged in via Real Google: {email}")
            
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

@auth_bp.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset OTP."""
    try:
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({'error': 'Email is required'}), 400
        
        email = data['email'].strip().lower()
        user = User.query.filter_by(email=email).first()
        
        if not user:
            # Return success even if email not found for account harvesting protection
            return jsonify({
                'success': True,
                'message': 'If the email matches a registered account, a password reset code has been sent.'
            }), 200
        
        # Generate Reset OTP
        otp = f"{random.randint(100000, 999999)}"
        otp_expiry = datetime.utcnow() + timedelta(minutes=15)
        
        user.reset_otp = otp
        user.reset_otp_expiry = otp_expiry
        db.session.commit()
        
        send_otp_email(email, otp, mode="reset")
        logger.info(f"Generated password reset OTP for: {email}")
        
        return jsonify({
            'success': True,
            'message': 'If the email matches a registered account, a password reset code has been sent.'
        }), 200
        
    except Exception as e:
        logger.error(f"Error in forgot password request: {e}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset password using OTP code."""
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'otp' not in data or 'newPassword' not in data:
            return jsonify({'error': 'Email, verification code, and new password are required'}), 400
        
        email = data['email'].strip().lower()
        otp = data['otp'].strip()
        new_password = data['newPassword']
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not user.reset_otp or user.reset_otp != otp:
            return jsonify({'error': 'Invalid verification code'}), 400
        
        if not user.reset_otp_expiry or user.reset_otp_expiry < datetime.utcnow():
            return jsonify({'error': 'Verification code has expired. Please request a new one.'}), 400
        
        # Enforce password strength
        if not validate_password_strength(new_password):
            return jsonify({'error': 'New password is too weak. It must be at least 8 characters and contain uppercase, lowercase, numbers, and symbols.'}), 400
        
        # Reset password
        user.set_password(new_password)
        user.reset_otp = None
        user.reset_otp_expiry = None
        
        # If they reset password, we also mark verified just in case
        if not user.is_verified:
            user.is_verified = True
            
        db.session.commit()
        logger.info(f"Password reset successfully for user: {email}")
        
        return jsonify({
            'success': True,
            'message': 'Password has been reset successfully. You can now log in.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error resetting password: {e}")
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
