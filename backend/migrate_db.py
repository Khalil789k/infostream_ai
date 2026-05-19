from app import app
from models import db
from sqlalchemy import text

def add_column():
    with app.app_context():
        try:
            # Check if column exists first (SQLite doesn't support IF NOT EXISTS in ALTER TABLE as easily)
            # But let's try the common one first
            db.session.execute(text('ALTER TABLE processed_documents ADD COLUMN frame_text TEXT'))
            db.session.commit()
            print("Successfully added frame_text column")
        except Exception as e:
            db.session.rollback()
            print(f"Error adding column (it might already exist): {e}")

if __name__ == "__main__":
    add_column()
