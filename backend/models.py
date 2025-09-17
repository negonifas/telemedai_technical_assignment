
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Инициализируем db объект
db = SQLAlchemy()

# Ассоциативная таблица для связи многие-ко-многим
question_categories = db.Table('question_categories',
    db.Column('question_id', db.Integer, db.ForeignKey('question.id'), primary_key=True),
    db.Column('category_id', db.Integer, db.ForeignKey('category.id'), primary_key=True)
)

class Category(db.Model):
    """
    Модель для хранения категорий/тем вопросов.
    """
    __tablename__ = 'category'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def __repr__(self):
        return f'<Category {self.name}>'

class Question(db.Model):
    """
    Модель для хранения вопросов и ответов.
    """
    __tablename__ = 'question'
    
    id = db.Column(db.Integer, primary_key=True)
    question_text = db.Column(db.Text, nullable=False)
    answer_text = db.Column(db.Text, nullable=False)
    topic = db.Column(db.String(200))
    score = db.Column(db.Integer, default=None)  # Добавляем недостающее поле score
    additional_data = db.Column(db.JSON)  # Для необязательных полей из CSV
    
    # Связь многие-ко-многим с категориями
    categories = db.relationship('Category', secondary=question_categories, lazy='subquery',
                                 backref=db.backref('questions', lazy=True))

    def __repr__(self):
        return f'<Question {self.id}>'

    def to_dict(self):
        """Конвертация объекта в словарь для JSON ответов"""
        return {
            'id': self.id,
            'question_text': self.question_text,
            'answer_text': self.answer_text,
            'topic': self.topic,
            'score': self.score,
            'additional_data': self.additional_data,
            'categories': [category.name for category in self.categories]
        }

