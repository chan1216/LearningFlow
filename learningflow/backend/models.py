from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import Text

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    learning_sessions = db.relationship('LearningSession', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# 파일 업로드부터 오답노트까지 모든 정보를 담는 통합 테이블
class LearningSession(db.Model):
    __tablename__ = 'learning_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # 파일 정보
    custom_filename = db.Column(db.String(255), nullable=False)  # 사용자 지정 파일명
    original_filename = db.Column(db.String(255), nullable=False)  # 원본 파일명
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    file_type = db.Column(db.String(10))
    category = db.Column(db.String(50), nullable=True)  # 카테고리 (과학, 수학, 영어, 논문 등)
    
    # 퀴즈/오답 정보
    question = db.Column(db.Text, nullable=True)  # 문제 (오답일 때만)
    user_answer = db.Column(db.Text, nullable=True)  # 사용자 답변
    correct_answer = db.Column(db.Text, nullable=True)  # 정답
    explanation = db.Column(db.Text, nullable=True)  # 해설
    is_wrong = db.Column(db.Boolean, default=False)  # 오답 여부
    summary_data = db.Column(Text(length=16777215), nullable=True)  # MEDIUMTEXT (16MB) - 긴 요약 지원
    quiz_data = db.Column(Text(length=16777215), nullable=True)
    wrong_notes_data = db.Column(Text(length=16777215), nullable=True)
    is_saved = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'custom_filename': self.custom_filename,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'category': self.category,
            'question': self.question,
            'user_answer': self.user_answer,
            'correct_answer': self.correct_answer,
            'explanation': self.explanation,
            'is_wrong': self.is_wrong,
            'summary_data': self.summary_data,
            'quiz_data': self.quiz_data,
            'wrong_notes_data': self.wrong_notes_data,
            'is_saved': self.is_saved,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
