import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

# Загружаем переменные окружения из .env файла
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# Создаем Flask приложение
app = Flask(__name__)

# Конфигурация
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://user:password@db:5432/medical_eval')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Импорт и инициализация db из models
from models import db
db.init_app(app)

# Инициализация CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Импорт роутов после инициализации db
import routes

# Создание таблиц в БД при запуске
with app.app_context():
    db.create_all()
    # --- Автосоздание (seed) базовых категорий при первом запуске ---
    try:
        from models import Category
        if Category.query.count() == 0:  # Если таблица пуста
            base_categories = [
                Category(name='Категория 1'),
                Category(name='Категория 2'),
                Category(name='Категория 3'),
                Category(name='Категория 4'),
            ]
            db.session.add_all(base_categories)
            db.session.commit()
            print('[INIT] Добавлены базовые категории (1-4).')
    except Exception as se:
        # Не прерываем запуск приложения, просто выводим сообщение
        print(f'[WARN] Не удалось выполнить сидирование категорий: {se}')

# Регистрация blueprint
app.register_blueprint(routes.api)

@app.route('/health')
def health_check():
    return "Backend is healthy and running!"

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)