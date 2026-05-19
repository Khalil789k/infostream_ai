from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime
from models import db, Chat, Message
from ai_services.chatbot import Chatbot
from .services import chatbot_sessions

logger = logging.getLogger(__name__)
chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/api/chatbot/ask', methods=['POST'])
@jwt_required()
def chatbot_ask():
    """Ask question to chatbot with RAG and save to database."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'question' not in data or 'documentContent' not in data:
            return jsonify({'error': 'Question and documentContent are required'}), 400
        
        question = data['question']
        document_content = data['documentContent']
        chat_id = data.get('chatId')
        title = data.get('title', 'New Chat')
        document_type = data.get('documentType', 'text')
        
        if not question or not question.strip():
            return jsonify({'error': 'Question must not be empty'}), 400
        
        # Get or create chat
        if chat_id:
            chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
            if not chat: return jsonify({'error': 'Chat not found'}), 404
        else:
            chat = Chat(
                user_id=user_id,
                title=title,
                document_content=document_content[:10000],
                document_type=document_type
            )
            db.session.add(chat)
            db.session.commit()
            chat_id = chat.id
        
        # Get session
        session_key = f"{user_id}_{chat_id}"
        if session_key not in chatbot_sessions:
            chatbot_sessions[session_key] = Chatbot()
            chatbot_sessions[session_key].build_index(document_content)
        elif 'refreshIndex' in data and data['refreshIndex']:
            chatbot_sessions[session_key].build_index(document_content)
        
        result = chatbot_sessions[session_key].generate_answer(question, document_content)
        
        # Save messages
        user_msg = Message(chat_id=chat_id, role='user', content=question)
        db.session.add(user_msg)
        
        bot_msg = Message(chat_id=chat_id, role='bot', content=result['answer'], references=result.get('references', []))
        db.session.add(bot_msg)
        
        chat.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'answer': result['answer'],
            'references': result.get('references', []),
            'chatId': chat_id,
            'messageId': bot_msg.id
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in chatbot: {e}")
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/api/chats', methods=['GET'])
@jwt_required()
def get_user_chats():
    """Get all chats for the user."""
    try:
        user_id = get_jwt_identity()
        chats = Chat.query.filter_by(user_id=user_id).order_by(Chat.updated_at.desc()).all()
        return jsonify({'success': True, 'chats': [chat.to_dict() for chat in chats]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/api/chats/<chat_id>', methods=['GET'])
@jwt_required()
def get_chat(chat_id):
    """Get chat details."""
    try:
        user_id = get_jwt_identity()
        chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
        if not chat: return jsonify({'error': 'Chat not found'}), 404
        
        chat_dict = chat.to_dict()
        chat_dict['messages'] = [msg.to_dict() for msg in chat.messages]
        chat_dict['documentContent'] = chat.document_content
        return jsonify({'success': True, 'chat': chat_dict}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/api/chats/<chat_id>', methods=['DELETE'])
@jwt_required()
def delete_chat(chat_id):
    """Delete chat."""
    try:
        user_id = get_jwt_identity()
        chat = Chat.query.filter_by(id=chat_id, user_id=user_id).first()
        if not chat: return jsonify({'error': 'Chat not found'}), 404
        
        session_key = f"{user_id}_{chat_id}"
        if session_key in chatbot_sessions: del chatbot_sessions[session_key]
        
        db.session.delete(chat)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
