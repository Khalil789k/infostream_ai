"""
Database Models for Info Stream AI
===================================
Production-ready SQLAlchemy models with:
- Proper enums and constraints
- Comprehensive indexes for performance
- Input validation
- Soft delete support
- Audit timestamps
- Type hints
"""

from __future__ import annotations
import uuid
import re
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Index, CheckConstraint, event
from sqlalchemy.orm import validates
from werkzeug.security import generate_password_hash, check_password_hash

# Initialize SQLAlchemy
db = SQLAlchemy()


# =============================================================================
# Enums
# =============================================================================

class SourceType(str, Enum):
    """Enum for document source types."""
    TEXT = 'text'
    PDF = 'pdf'
    DOCX = 'docx'
    URL = 'url'
    VIDEO = 'video'


class MessageRole(str, Enum):
    """Enum for chat message roles."""
    USER = 'user'
    BOT = 'bot'
    SYSTEM = 'system'


class ProcessingStatus(str, Enum):
    """Enum for document processing status."""
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'


# =============================================================================
# Mixins
# =============================================================================

class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""
    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class SoftDeleteMixin:
    """Mixin for soft delete functionality."""
    is_deleted = db.Column(db.Boolean, default=False, nullable=False, index=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    
    def soft_delete(self) -> None:
        """Mark record as deleted without removing from database."""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
    
    def restore(self) -> None:
        """Restore a soft-deleted record."""
        self.is_deleted = False
        self.deleted_at = None


# =============================================================================
# Models
# =============================================================================

class User(db.Model, TimestampMixin, SoftDeleteMixin):
    """
    User model for authentication and user management.
    
    Attributes:
        id: Unique identifier (UUID)
        email: User's email address (unique)
        password_hash: Hashed password
        display_name: User's display name
        photo_url: Profile photo URL
        is_active: Whether user account is active
        last_login_at: Last login timestamp
    """
    __tablename__ = 'users'
    
    # Primary Key
    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # Core Fields
    email = db.Column(
        db.String(255),
        unique=True,
        nullable=False,
        index=True
    )
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(100), nullable=True)
    photo_url = db.Column(db.Text, nullable=True)
    
    # Status Fields
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_otp = db.Column(db.String(10), nullable=True)
    verification_otp_expiry = db.Column(db.DateTime, nullable=True)
    reset_otp = db.Column(db.String(10), nullable=True)
    reset_otp_expiry = db.Column(db.DateTime, nullable=True)
    last_login_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    chats = db.relationship(
        'Chat',
        backref='user',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )
    documents = db.relationship(
        'ProcessedDocument',
        backref='user',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint('length(email) >= 5', name='check_email_length'),
        CheckConstraint('length(password_hash) >= 10', name='check_password_hash_length'),
        Index('idx_users_email_active', 'email', 'is_active'),
    )
    
    # Validation
    @validates('email')
    def validate_email(self, key: str, email: str) -> str:
        """Validate email format."""
        if not email:
            raise ValueError("Email is required")
        
        email = email.strip().lower()
        
        # Basic email regex validation
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, email):
            raise ValueError("Invalid email format")
        
        return email
    
    @validates('display_name')
    def validate_display_name(self, key: str, name: Optional[str]) -> Optional[str]:
        """Validate and sanitize display name."""
        if name:
            name = name.strip()
            if len(name) > 100:
                raise ValueError("Display name must be 100 characters or less")
        return name
    
    # Password Methods
    def set_password(self, password: str) -> None:
        """Hash and set password securely."""
        if not password or len(password) < 6:
            raise ValueError("Password must be at least 6 characters")
        self.password_hash = generate_password_hash(
            password,
            method='pbkdf2:sha256',
            salt_length=16
        )
    
    def check_password(self, password: str) -> bool:
        """Verify password against hash."""
        if not password or not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    def update_last_login(self) -> None:
        """Update last login timestamp."""
        self.last_login_at = datetime.utcnow()
    
    # Serialization
    def to_dict(self, include_stats: bool = False) -> Dict[str, Any]:
        """Convert user to dictionary (excludes sensitive data)."""
        data = {
            'id': self.id,
            'email': self.email,
            'displayName': self.display_name,
            'photoURL': self.photo_url,
            'isActive': self.is_active,
            'isVerified': self.is_verified,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'lastLoginAt': self.last_login_at.isoformat() if self.last_login_at else None,
        }
        
        if include_stats:
            data['documentCount'] = self.documents.filter_by(is_deleted=False).count()
            data['chatCount'] = self.chats.filter_by(is_deleted=False).count()
        
        return data
    
    def __repr__(self) -> str:
        return f'<User {self.email}>'


class ProcessedDocument(db.Model, TimestampMixin, SoftDeleteMixin):
    """
    ProcessedDocument model for storing analyzed content.
    
    Stores original content and AI-generated analysis results.
    Supports text, PDF, DOCX, URL, and video sources.
    """
    __tablename__ = 'processed_documents'
    
    # Primary Key
    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # Foreign Key
    user_id = db.Column(
        db.String(36),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Core Fields
    title = db.Column(db.String(200), nullable=False)
    source_type = db.Column(
        db.String(20),
        nullable=False,
        default=SourceType.TEXT.value
    )
    source_text = db.Column(db.Text, nullable=False)
    
    # AI-Generated Content (On-Demand)
    summary = db.Column(db.Text, nullable=True)
    keywords = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    translated_text = db.Column(db.Text, nullable=True)
    frame_text = db.Column(db.Text, nullable=True)
    
    # Processing Status
    processing_status = db.Column(
        db.String(20),
        default=ProcessingStatus.PENDING.value,
        nullable=False
    )
    
    # Source Metadata
    source_url = db.Column(db.String(2000), nullable=True)
    file_name = db.Column(db.String(255), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)  # Size in bytes
    
    # Video-Specific Fields
    video_id = db.Column(db.String(100), nullable=True)
    original_video_url = db.Column(db.String(2000), nullable=True)
    dubbed_video_url = db.Column(db.String(2000), nullable=True)
    video_duration = db.Column(db.Float, nullable=True)  # Duration in seconds
    transcription_segments = db.Column(db.JSON, nullable=True)  # Cached segments for dubbing/captions
    
    # Content Stats
    word_count = db.Column(db.Integer, nullable=True)
    char_count = db.Column(db.Integer, nullable=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_documents_user_created', 'user_id', 'created_at'),
        Index('idx_documents_user_type', 'user_id', 'source_type'),
        Index('idx_documents_user_status', 'user_id', 'processing_status'),
        Index('idx_documents_not_deleted', 'user_id', 'is_deleted'),
        CheckConstraint('length(title) >= 1', name='check_title_not_empty'),
        CheckConstraint('length(source_text) >= 10', name='check_source_text_min_length'),
    )
    
    # Validation
    @validates('title')
    def validate_title(self, key: str, title: str) -> str:
        """Validate document title."""
        if not title:
            raise ValueError("Title is required")
        title = title.strip()
        if len(title) > 75:
            title = title[:72].strip() + "..."
        return title
    
    @validates('source_type')
    def validate_source_type(self, key: str, source_type: str) -> str:
        """Validate source type is allowed."""
        valid_types = [t.value for t in SourceType]
        if source_type not in valid_types:
            raise ValueError(f"Invalid source type. Must be one of: {valid_types}")
        return source_type
    
    @validates('source_text')
    def validate_source_text(self, key: str, text: str) -> str:
        """Validate source text."""
        if not text or len(text.strip()) < 10:
            raise ValueError("Source text must be at least 10 characters")
        return text
    
    # Helper Methods
    def update_stats(self) -> None:
        """Calculate and update content statistics."""
        if self.source_text:
            self.char_count = len(self.source_text)
            self.word_count = len(self.source_text.split())
    
    def mark_processing(self) -> None:
        """Mark document as currently processing."""
        self.processing_status = ProcessingStatus.PROCESSING.value
    
    def mark_completed(self) -> None:
        """Mark document processing as completed."""
        self.processing_status = ProcessingStatus.COMPLETED.value
    
    def mark_failed(self) -> None:
        """Mark document processing as failed."""
        self.processing_status = ProcessingStatus.FAILED.value
    
    # Serialization
    def to_dict(self, include_content: bool = True) -> Dict[str, Any]:
        """Convert document to dictionary."""
        data = {
            'id': self.id,
            'userId': self.user_id,
            'title': self.title,
            'sourceType': self.source_type,
            'processingStatus': self.processing_status,
            'wordCount': self.word_count,
            'charCount': self.char_count,
            'sourceUrl': self.source_url,
            'fileName': self.file_name,
            'fileSize': self.file_size,
            'videoId': self.video_id,
            'originalVideoUrl': self.original_video_url,
            'dubbedVideoUrl': self.dubbed_video_url,
            'videoDuration': self.video_duration,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_content:
            data.update({
                'sourceText': self.source_text,
                'sourceTitle': self.title,
                'summary': self.summary,
                'keywords': self.keywords,
                'notes': self.notes,
                'translatedText': self.translated_text,
                'frameText': self.frame_text,
            })
        
        return data
    
    def __repr__(self) -> str:
        return f'<ProcessedDocument {self.id}: {self.title[:30]}>'


class Chat(db.Model, TimestampMixin, SoftDeleteMixin):
    """
    Chat model for AI chatbot conversations.
    
    Stores chat sessions with document context.
    """
    __tablename__ = 'chats'
    
    # Primary Key
    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # Foreign Key
    user_id = db.Column(
        db.String(36),
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Core Fields
    title = db.Column(db.String(200), nullable=False)
    document_content = db.Column(db.Text, nullable=True)
    document_type = db.Column(db.String(20), nullable=True)
    
    # Optional: Link to processed document
    document_id = db.Column(
        db.String(36),
        db.ForeignKey('processed_documents.id', ondelete='SET NULL'),
        nullable=True,
        index=True
    )
    
    # Relationships
    messages = db.relationship(
        'Message',
        backref='chat',
        lazy='dynamic',
        cascade='all, delete-orphan',
        order_by='Message.created_at'
    )
    
    # Indexes
    __table_args__ = (
        Index('idx_chats_user_updated', 'user_id', 'updated_at'),
        Index('idx_chats_not_deleted', 'user_id', 'is_deleted'),
    )
    
    # Validation
    @validates('title')
    def validate_title(self, key: str, title: str) -> str:
        """Validate chat title."""
        if not title:
            title = "New Chat"
        title = title.strip()
        if len(title) > 200:
            title = title[:200]
        return title
    
    # Helper Methods
    def get_message_count(self) -> int:
        """Get total number of messages in chat."""
        return self.messages.filter_by(is_deleted=False).count()
    
    # Serialization
    def to_dict(self, include_messages: bool = False) -> Dict[str, Any]:
        """Convert chat to dictionary."""
        data = {
            'id': self.id,
            'userId': self.user_id,
            'title': self.title,
            'documentType': self.document_type,
            'documentId': self.document_id,
            'messageCount': self.get_message_count(),
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_messages:
            data['messages'] = [
                msg.to_dict() for msg in self.messages.filter_by(is_deleted=False).all()
            ]
            data['documentContent'] = self.document_content
        
        return data
    
    def __repr__(self) -> str:
        return f'<Chat {self.id}: {self.title[:30]}>'


class Message(db.Model, TimestampMixin, SoftDeleteMixin):
    """
    Message model for individual chat messages.
    """
    __tablename__ = 'messages'
    
    # Primary Key
    id = db.Column(
        db.String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    
    # Foreign Key
    chat_id = db.Column(
        db.String(36),
        db.ForeignKey('chats.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Core Fields
    role = db.Column(
        db.String(20),
        nullable=False,
        default=MessageRole.USER.value
    )
    content = db.Column(db.Text, nullable=False)
    references = db.Column(db.JSON, nullable=True)
    
    # Token count for AI usage tracking
    token_count = db.Column(db.Integer, nullable=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_messages_chat_created', 'chat_id', 'created_at'),
        CheckConstraint(
            f"role IN ('{MessageRole.USER.value}', '{MessageRole.BOT.value}', '{MessageRole.SYSTEM.value}')",
            name='check_valid_role'
        ),
    )
    
    # Validation
    @validates('role')
    def validate_role(self, key: str, role: str) -> str:
        """Validate message role."""
        valid_roles = [r.value for r in MessageRole]
        if role not in valid_roles:
            raise ValueError(f"Invalid role. Must be one of: {valid_roles}")
        return role
    
    @validates('content')
    def validate_content(self, key: str, content: str) -> str:
        """Validate message content."""
        if not content or not content.strip():
            raise ValueError("Message content cannot be empty")
        return content.strip()
    
    # Serialization
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary."""
        return {
            'id': self.id,
            'chatId': self.chat_id,
            'role': self.role,
            'content': self.content,
            'references': self.references or [],
            'tokenCount': self.token_count,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
    
    def __repr__(self) -> str:
        return f'<Message {self.id}: {self.role}>'


# =============================================================================
# Event Listeners
# =============================================================================

@event.listens_for(ProcessedDocument, 'before_insert')
def calculate_stats_before_insert(mapper, connection, target):
    """Auto-calculate stats before inserting document."""
    if target.source_text:
        target.char_count = len(target.source_text)
        target.word_count = len(target.source_text.split())


@event.listens_for(ProcessedDocument, 'before_update')
def calculate_stats_before_update(mapper, connection, target):
    """Auto-calculate stats before updating document."""
    if target.source_text:
        target.char_count = len(target.source_text)
        target.word_count = len(target.source_text.split())
