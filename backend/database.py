

import os
import logging
from contextlib import contextmanager
from typing import Generator, Optional
from datetime import datetime

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text, event
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from sqlalchemy.engine import Engine

from models import db, User, Chat, Message, ProcessedDocument
from config import get_config

# Configure logging
logger = logging.getLogger(__name__)

# Disable SQLAlchemy verbose logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)


class DatabaseManager:
    """
    Database manager for handling all database operations.
    Provides connection pooling, health checks, and utilities.
    """
    
    _instance: Optional['DatabaseManager'] = None
    _initialized: bool = False
    
    def __new__(cls) -> 'DatabaseManager':
        """Singleton pattern for database manager."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize database manager."""
        if not self._initialized:
            self.app: Optional[Flask] = None
            self.config = get_config()
            DatabaseManager._initialized = True
    
    def init_app(self, app: Flask) -> None:
        """
        Initialize database with Flask application.
        
        Args:
            app: Flask application instance
        """
        self.app = app
        
        # Configure database URL
        db_uri = self.config.get_database_uri()
        app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = self.config.SQLALCHEMY_TRACK_MODIFICATIONS
        app.config['SQLALCHEMY_ECHO'] = self.config.SQLALCHEMY_ECHO
        
        # Clean engine pool parameters for SQLite fallback compatibility
        engine_options = self.config.SQLALCHEMY_ENGINE_OPTIONS.copy()
        if db_uri.startswith('sqlite:'):
            engine_options.pop('pool_size', None)
            engine_options.pop('max_overflow', None)
            engine_options.pop('pool_timeout', None)
            
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = engine_options
        
        # JWT Configuration
        app.config['JWT_SECRET_KEY'] = self.config.JWT_SECRET_KEY
        app.config['JWT_ACCESS_TOKEN_EXPIRES'] = self.config.JWT_ACCESS_TOKEN_EXPIRES
        
        # Initialize SQLAlchemy
        db.init_app(app)
        
        # Register event listeners for connection pool
        self._setup_engine_events()
        
        # Create tables
        self._create_tables()
        
        logger.info("Database initialized successfully")
    
    def _setup_engine_events(self) -> None:
        """Setup SQLAlchemy engine event listeners."""
        
        @event.listens_for(Engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            """Set connection-level configurations (busy timeout for SQLite)."""
            if type(dbapi_connection).__module__ == 'sqlite3':
                try:
                    cursor = dbapi_connection.cursor()
                    cursor.execute("PRAGMA busy_timeout = 30000;")
                    cursor.close()
                except Exception:
                    pass
        
        @event.listens_for(Engine, "checkout")
        def check_connection(dbapi_connection, connection_record, connection_proxy):
            """Verify connection is valid on checkout from pool."""
            pass  # Connection health is handled by pool_pre_ping
    
    def _create_tables(self) -> None:
        """Create all database tables."""
        with self.app.app_context():
            try:
                db.create_all()
                logger.info("Database tables created/verified successfully")
                
                # Dynamic migration to add transcription_segments JSON column if missing
                try:
                    db.session.execute(text("ALTER TABLE processed_documents ADD COLUMN IF NOT EXISTS transcription_segments JSON;"))
                    db.session.commit()
                    logger.info("Database migration: Checked/Added transcription_segments column to processed_documents table.")
                except Exception as e:
                    db.session.rollback()
                    logger.warning(f"Database migration note: Skipped manual column addition (expected if already present or using SQLite): {e}")
            except SQLAlchemyError as e:
                logger.error(f"Error creating database tables: {e}")
                raise
    
    def health_check(self) -> dict:
        """
        Perform database health check.
        
        Returns:
            dict: Health status with details
        """
        try:
            with self.app.app_context():
                # Execute simple query to verify connection
                result = db.session.execute(text("SELECT 1 as health"))
                result.fetchone()
                
                # Get connection pool stats
                pool = db.engine.pool
                pool_status = {
                    'pool_size': pool.size(),
                    'checked_in': pool.checkedin(),
                    'checked_out': pool.checkedout(),
                    'overflow': pool.overflow(),
                }
                
                return {
                    'status': 'healthy',
                    'database': 'connected',
                    'pool': pool_status,
                    'timestamp': datetime.utcnow().isoformat()
                }
        except OperationalError as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'status': 'unhealthy',
                'database': 'disconnected',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    @contextmanager
    def transaction(self) -> Generator:
        """
        Context manager for database transactions.
        Automatically commits or rolls back on error.
        
        Usage:
            with db_manager.transaction():
                user = User(email='test@test.com')
                db.session.add(user)
        """
        try:
            yield db.session
            db.session.commit()
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Transaction failed, rolled back: {e}")
            raise
        finally:
            db.session.close()
    
    def clear_all_data(self) -> dict:
        """
        Clear all data from all tables.
        WARNING: This is destructive! Use with caution.
        
        Returns:
            dict: Summary of deleted records
        """
        with self.app.app_context():
            try:
                # Count records before deletion
                counts = {
                    'messages': Message.query.count(),
                    'chats': Chat.query.count(),
                    'documents': ProcessedDocument.query.count(),
                    'users': User.query.count(),
                }
                
                # Delete in correct order (respect foreign keys)
                Message.query.delete()
                Chat.query.delete()
                ProcessedDocument.query.delete()
                User.query.delete()
                
                db.session.commit()
                
                logger.warning(f"Cleared all database data: {counts}")
                
                return {
                    'success': True,
                    'deleted': counts,
                    'timestamp': datetime.utcnow().isoformat()
                }
            except SQLAlchemyError as e:
                db.session.rollback()
                logger.error(f"Error clearing database: {e}")
                return {
                    'success': False,
                    'error': str(e),
                    'timestamp': datetime.utcnow().isoformat()
                }
    
    def reset_database(self) -> dict:
        """
        Drop all tables and recreate them.
        WARNING: This is highly destructive!
        
        Returns:
            dict: Status of operation
        """
        with self.app.app_context():
            try:
                # Drop all tables
                db.drop_all()
                logger.warning("All database tables dropped")
                
                # Recreate tables
                db.create_all()
                logger.info("Database tables recreated")
                
                return {
                    'success': True,
                    'message': 'Database reset successfully',
                    'timestamp': datetime.utcnow().isoformat()
                }
            except SQLAlchemyError as e:
                logger.error(f"Error resetting database: {e}")
                return {
                    'success': False,
                    'error': str(e),
                    'timestamp': datetime.utcnow().isoformat()
                }
    
    def get_stats(self) -> dict:
        """
        Get database statistics.
        
        Returns:
            dict: Statistics about database content
        """
        with self.app.app_context():
            try:
                return {
                    'users': {
                        'total': User.query.count(),
                        'active': User.query.filter_by(is_active=True, is_deleted=False).count(),
                    },
                    'documents': {
                        'total': ProcessedDocument.query.count(),
                        'active': ProcessedDocument.query.filter_by(is_deleted=False).count(),
                        'by_type': {
                            'text': ProcessedDocument.query.filter_by(source_type='text', is_deleted=False).count(),
                            'pdf': ProcessedDocument.query.filter_by(source_type='pdf', is_deleted=False).count(),
                            'docx': ProcessedDocument.query.filter_by(source_type='docx', is_deleted=False).count(),
                            'url': ProcessedDocument.query.filter_by(source_type='url', is_deleted=False).count(),
                            'video': ProcessedDocument.query.filter_by(source_type='video', is_deleted=False).count(),
                        }
                    },
                    'chats': {
                        'total': Chat.query.count(),
                        'active': Chat.query.filter_by(is_deleted=False).count(),
                    },
                    'messages': {
                        'total': Message.query.count(),
                        'active': Message.query.filter_by(is_deleted=False).count(),
                    },
                    'timestamp': datetime.utcnow().isoformat()
                }
            except SQLAlchemyError as e:
                logger.error(f"Error getting database stats: {e}")
                return {'error': str(e)}


# Global database manager instance
db_manager = DatabaseManager()


def init_db(app: Flask) -> None:
    """
    Initialize database connection and create tables.
    This function maintains backward compatibility with existing code.
    
    Args:
        app: Flask application instance
    """
    db_manager.init_app(app)


def get_db() -> SQLAlchemy:
    """Get SQLAlchemy database instance."""
    return db


def get_db_manager() -> DatabaseManager:
    """Get database manager instance."""
    return db_manager
