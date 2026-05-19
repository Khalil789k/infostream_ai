from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from models import db, ProcessedDocument

logger = logging.getLogger(__name__)
documents_bp = Blueprint('documents', __name__)

@documents_bp.route('/api/documents', methods=['GET'])
@jwt_required()
def get_user_documents():
    """Get all processed documents for the current user."""
    try:
        user_id = get_jwt_identity()
        documents = ProcessedDocument.query.filter_by(user_id=user_id, is_deleted=False).order_by(ProcessedDocument.updated_at.desc()).all()
        return jsonify({
            'success': True,
            'documents': [doc.to_dict() for doc in documents]
        }), 200
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/api/documents/<document_id>', methods=['GET'])
@jwt_required()
def get_document(document_id):
    """Get a specific processed document by ID."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id, is_deleted=False).first()
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        return jsonify({
            'success': True,
            'document': document.to_dict()
        }), 200
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/api/documents/clear', methods=['DELETE'])
@jwt_required()
def clear_all_documents():
    """Clear all processed documents for the current user permanently."""
    try:
        user_id = get_jwt_identity()
        ProcessedDocument.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        
        logger.info(f"All documents cleared permanently for user {user_id}")
        return jsonify({
            'success': True,
            'message': 'All documents and history cleared successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error clearing documents: {e}")
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/api/documents/<document_id>', methods=['DELETE'])
@jwt_required()
def delete_document(document_id):
    """Delete a processed document (soft delete)."""
    try:
        user_id = get_jwt_identity()
        document = ProcessedDocument.query.filter_by(id=document_id, user_id=user_id, is_deleted=False).first()
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        # In professional setup, we prefer soft delete
        document.is_deleted = True
        import datetime
        document.deleted_at = datetime.datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Document {document_id} soft-deleted by user {user_id}")
        return jsonify({'success': True, 'message': 'Document deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting document: {e}")
        return jsonify({'error': str(e)}), 500
