

import logging
from typing import Optional, List, Dict, Any, Type, TypeVar
from datetime import datetime
from functools import wraps

from flask import abort
from sqlalchemy import or_, and_, desc, asc
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from models import db, User, ProcessedDocument, Chat, Message

# Configure logging
logger = logging.getLogger(__name__)

# Type variable for generic model operations
T = TypeVar('T', bound=db.Model)


# =============================================================================
# Decorators
# =============================================================================

def handle_db_errors(func):

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except IntegrityError as e:
            db.session.rollback()
            logger.error(f"Database integrity error in {func.__name__}: {e}")
            raise ValueError(f"Database constraint violation: {str(e)}")
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error in {func.__name__}: {e}")
            raise RuntimeError(f"Database operation failed: {str(e)}")
    return wrapper


# =============================================================================
# User Operations
# =============================================================================

@handle_db_errors
def create_user(email: str, password: str, display_name: Optional[str] = None) -> User:

    # Check if user exists
    existing = User.query.filter_by(email=email.lower()).first()
    if existing:
        raise ValueError("User with this email already exists")
    
    user = User(
        email=email,
        display_name=display_name or email.split('@')[0]
    )
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    logger.info(f"Created new user: {email}")
    return user


@handle_db_errors
def get_user_by_id(user_id: str) -> Optional[User]:
    """Get user by ID."""
    return User.query.filter_by(id=user_id, is_deleted=False).first()


@handle_db_errors
def get_user_by_email(email: str) -> Optional[User]:
    """Get user by email."""
    return User.query.filter_by(email=email.lower(), is_deleted=False).first()


@handle_db_errors
def authenticate_user(email: str, password: str) -> Optional[User]:

    user = get_user_by_email(email)
    
    if user and user.is_active and user.check_password(password):
        user.update_last_login()
        db.session.commit()
        return user
    
    return None


@handle_db_errors
def update_user(user_id: str, **kwargs) -> Optional[User]:

    user = get_user_by_id(user_id)
    if not user:
        return None
    
    allowed_fields = {'display_name', 'photo_url', 'is_active'}
    for key, value in kwargs.items():
        if key in allowed_fields:
            setattr(user, key, value)
    
    db.session.commit()
    return user


@handle_db_errors
def delete_user(user_id: str, hard_delete: bool = False) -> bool:

    user = get_user_by_id(user_id)
    if not user:
        return False
    
    if hard_delete:
        db.session.delete(user)
    else:
        user.soft_delete()
    
    db.session.commit()
    logger.info(f"Deleted user: {user_id} (hard={hard_delete})")
    return True


# =============================================================================
# Document Operations
# =============================================================================

@handle_db_errors
def create_document(
    user_id: str,
    title: str,
    source_type: str,
    source_text: str,
    **kwargs
) -> ProcessedDocument:

    doc = ProcessedDocument(
        user_id=user_id,
        title=title,
        source_type=source_type,
        source_text=source_text,
        **kwargs
    )
    
    db.session.add(doc)
    db.session.commit()
    
    logger.info(f"Created document: {doc.id} for user {user_id}")
    return doc


@handle_db_errors
def get_document_by_id(document_id: str, user_id: Optional[str] = None) -> Optional[ProcessedDocument]:

    query = ProcessedDocument.query.filter_by(id=document_id, is_deleted=False)
    
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    return query.first()


@handle_db_errors
def get_user_documents(
    user_id: str,
    source_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    order_by: str = 'created_at',
    order_desc: bool = True
) -> List[ProcessedDocument]:

    query = ProcessedDocument.query.filter_by(user_id=user_id, is_deleted=False)
    
    if source_type:
        query = query.filter_by(source_type=source_type)
    
    # Order by
    order_column = getattr(ProcessedDocument, order_by, ProcessedDocument.created_at)
    query = query.order_by(desc(order_column) if order_desc else asc(order_column))
    
    return query.offset(offset).limit(limit).all()


@handle_db_errors
def update_document(document_id: str, user_id: str, **kwargs) -> Optional[ProcessedDocument]:

    doc = get_document_by_id(document_id, user_id)
    if not doc:
        return None
    
    allowed_fields = {
        'title', 'summary', 'keywords', 'notes', 'translated_text',
        'processing_status', 'dubbed_video_url'
    }
    
    for key, value in kwargs.items():
        if key in allowed_fields:
            setattr(doc, key, value)
    
    db.session.commit()
    return doc


@handle_db_errors
def delete_document(document_id: str, user_id: str, hard_delete: bool = False) -> bool:

    doc = get_document_by_id(document_id, user_id)
    if not doc:
        return False
    
    if hard_delete:
        db.session.delete(doc)
    else:
        doc.soft_delete()
    
    db.session.commit()
    logger.info(f"Deleted document: {document_id} (hard={hard_delete})")
    return True


@handle_db_errors
def search_documents(
    user_id: str,
    query_text: str,
    source_types: Optional[List[str]] = None,
    limit: int = 20
) -> List[ProcessedDocument]:

    search_pattern = f"%{query_text}%"
    
    query = ProcessedDocument.query.filter(
        ProcessedDocument.user_id == user_id,
        ProcessedDocument.is_deleted == False,
        or_(
            ProcessedDocument.title.ilike(search_pattern),
            ProcessedDocument.source_text.ilike(search_pattern),
            ProcessedDocument.summary.ilike(search_pattern)
        )
    )
    
    if source_types:
        query = query.filter(ProcessedDocument.source_type.in_(source_types))
    
    return query.order_by(desc(ProcessedDocument.created_at)).limit(limit).all()


# =============================================================================
# Chat Operations
# =============================================================================

@handle_db_errors
def create_chat(
    user_id: str,
    title: str,
    document_content: Optional[str] = None,
    document_type: Optional[str] = None,
    document_id: Optional[str] = None
) -> Chat:

    chat = Chat(
        user_id=user_id,
        title=title,
        document_content=document_content[:10000] if document_content else None,
        document_type=document_type,
        document_id=document_id
    )
    
    db.session.add(chat)
    db.session.commit()
    
    logger.info(f"Created chat: {chat.id} for user {user_id}")
    return chat


@handle_db_errors
def get_chat_by_id(chat_id: str, user_id: Optional[str] = None) -> Optional[Chat]:
    """Get chat by ID."""
    query = Chat.query.filter_by(id=chat_id, is_deleted=False)
    
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    return query.first()


@handle_db_errors
def get_user_chats(
    user_id: str,
    limit: int = 50,
    offset: int = 0
) -> List[Chat]:
    """Get all chats for a user."""
    return Chat.query.filter_by(
        user_id=user_id,
        is_deleted=False
    ).order_by(
        desc(Chat.updated_at)
    ).offset(offset).limit(limit).all()


@handle_db_errors
def delete_chat(chat_id: str, user_id: str, hard_delete: bool = False) -> bool:
    """Delete chat (soft delete by default)."""
    chat = get_chat_by_id(chat_id, user_id)
    if not chat:
        return False
    
    if hard_delete:
        db.session.delete(chat)
    else:
        chat.soft_delete()
    
    db.session.commit()
    logger.info(f"Deleted chat: {chat_id} (hard={hard_delete})")
    return True


# =============================================================================
# Message Operations
# =============================================================================

@handle_db_errors
def create_message(
    chat_id: str,
    role: str,
    content: str,
    references: Optional[List[str]] = None,
    token_count: Optional[int] = None
) -> Message:

    message = Message(
        chat_id=chat_id,
        role=role,
        content=content,
        references=references,
        token_count=token_count
    )
    
    db.session.add(message)
    
    # Update chat's updated_at timestamp
    chat = Chat.query.get(chat_id)
    if chat:
        chat.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    return message


@handle_db_errors
def get_chat_messages(
    chat_id: str,
    limit: int = 100,
    offset: int = 0
) -> List[Message]:
    """Get all messages for a chat."""
    return Message.query.filter_by(
        chat_id=chat_id,
        is_deleted=False
    ).order_by(
        asc(Message.created_at)
    ).offset(offset).limit(limit).all()


# =============================================================================
# Batch Operations
# =============================================================================

@handle_db_errors
def batch_delete_documents(document_ids: List[str], user_id: str) -> int:
    """
    Batch delete multiple documents.
    
    Args:
        document_ids: List of document IDs
        user_id: User ID for ownership verification
    
    Returns:
        int: Number of documents deleted
    """
    deleted_count = ProcessedDocument.query.filter(
        ProcessedDocument.id.in_(document_ids),
        ProcessedDocument.user_id == user_id,
        ProcessedDocument.is_deleted == False
    ).update(
        {ProcessedDocument.is_deleted: True, ProcessedDocument.deleted_at: datetime.utcnow()},
        synchronize_session=False
    )
    
    db.session.commit()
    logger.info(f"Batch deleted {deleted_count} documents for user {user_id}")
    return deleted_count


@handle_db_errors
def get_user_stats(user_id: str) -> Dict[str, Any]:

    docs = ProcessedDocument.query.filter_by(user_id=user_id, is_deleted=False)
    chats = Chat.query.filter_by(user_id=user_id, is_deleted=False)
    
    return {
        'totalDocuments': docs.count(),
        'documentsByType': {
            'text': docs.filter_by(source_type='text').count(),
            'pdf': docs.filter_by(source_type='pdf').count(),
            'docx': docs.filter_by(source_type='docx').count(),
            'url': docs.filter_by(source_type='url').count(),
            'video': docs.filter_by(source_type='video').count(),
        },
        'totalChats': chats.count(),
        'totalMessages': Message.query.join(Chat).filter(
            Chat.user_id == user_id,
            Message.is_deleted == False
        ).count(),
    }


# =============================================================================
# Cleanup Operations
# =============================================================================

@handle_db_errors
def cleanup_soft_deleted(days_old: int = 30) -> Dict[str, int]:

    from datetime import timedelta
    cutoff_date = datetime.utcnow() - timedelta(days=days_old)
    
    deleted = {
        'messages': 0,
        'chats': 0,
        'documents': 0,
        'users': 0,
    }
    
    # Delete in correct order (respect foreign keys)
    deleted['messages'] = Message.query.filter(
        Message.is_deleted == True,
        Message.deleted_at < cutoff_date
    ).delete(synchronize_session=False)
    
    deleted['chats'] = Chat.query.filter(
        Chat.is_deleted == True,
        Chat.deleted_at < cutoff_date
    ).delete(synchronize_session=False)
    
    deleted['documents'] = ProcessedDocument.query.filter(
        ProcessedDocument.is_deleted == True,
        ProcessedDocument.deleted_at < cutoff_date
    ).delete(synchronize_session=False)
    
    deleted['users'] = User.query.filter(
        User.is_deleted == True,
        User.deleted_at < cutoff_date
    ).delete(synchronize_session=False)
    
    db.session.commit()
    
    logger.info(f"Cleanup completed: {deleted}")
    return deleted

