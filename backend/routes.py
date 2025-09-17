from flask import Blueprint, request, jsonify
import pandas as pd
from models import Question, Category, db
from sqlalchemy.exc import IntegrityError
import pandas as pd
from flask import send_file
from datetime import datetime
import io
from functions.export import export_csv, export_excel


api = Blueprint('api', __name__)

@api.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Эндпоинт для загрузки и обработки .xlsx файла.
    """
    if 'file' not in request.files:
        return jsonify({"error": "В запросе отсутствует файл (file part)"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "Файл не выбран"}), 400
    
    # --- Проверка размера файла (лимит 10 МБ) ---
    MAX_SIZE = 10 * 1024 * 1024  # 10 МБ
    content_length = request.content_length  # Может быть None
    if content_length and content_length > MAX_SIZE:
        return jsonify({"error": f"Размер файла превышает 10 МБ (получено ~{content_length / (1024*1024):.2f} МБ)"}), 400

    # Если заголовка Content-Length нет или нужно перепроверить, читаем ограниченно
    # Создадим временный буфер из первых (MAX_SIZE + 1) байт, чтобы не читать гигантский файл целиком
    if not content_length:
        # Сохраняем позицию и читаем ограниченно
        pos = file.stream.tell()
        head = file.stream.read(MAX_SIZE + 1)
        if len(head) > MAX_SIZE:
            return jsonify({"error": "Размер файла превышает 10 МБ"}), 400
        # Возвращаемся в начало, чтобы pandas мог прочитать файл
        file.stream.seek(pos)

    if file and file.filename.endswith('.xlsx'):
        try:
            df = pd.read_excel(file, engine='openpyxl')

            # --- Валидация ---
            required_columns = ['question_id', 'question_text', 'answer_text']
            if not all(col in df.columns for col in required_columns):
                missing_cols = [col for col in required_columns if col not in df.columns]
                return jsonify({"error": f"В файле отсутствуют необходимые колонки: {', '.join(missing_cols)}"}), 400

            # Проверяем дубликаты question_id
            duplicates = df[df.duplicated(subset=['question_id'], keep=False)]
            if not duplicates.empty:
                duplicate_ids = duplicates['question_id'].unique().tolist()
                duplicate_rows = []
                for dup_id in duplicate_ids:
                    rows = df[df['question_id'] == dup_id].index.tolist()
                    # +2 потому что pandas индексы с 0, а Excel строки с 1, плюс заголовок
                    excel_rows = [row + 2 for row in rows]
                    duplicate_rows.extend(excel_rows)
                
                return jsonify({
                    'error': 'Обнаружены дубликаты question_id',
                    'duplicate_question_ids': duplicate_ids,
                    'duplicate_rows': sorted(duplicate_rows),
                    'message': f'Дубликаты найдены в строках: {", ".join(map(str, sorted(duplicate_rows)))}'
                }), 400
            
            # Проверяем наличие пустых значений в обязательных полях
            empty_rows = []
            for index, row in df.iterrows():
                if pd.isna(row['question_id']) or pd.isna(row['question_text']) or pd.isna(row['answer_text']):
                    empty_rows.append(index + 2)  # +2 для Excel нумерации
            
            if empty_rows:
                return jsonify({
                    'error': 'Обнаружены пустые значения в обязательных полях',
                    'empty_rows': empty_rows,
                    'message': f'Пустые значения в строках: {", ".join(map(str, empty_rows))}'
                }), 400
            
            # Очищаем таблицу перед загрузкой новых данных
            Question.query.delete()
            Category.query.delete()
            db.session.commit()

            # --- Наполнение БД ---
            questions_to_add = []
            for index, row in df.iterrows():
                # Определяем обязательные поля
                question_id = int(row['question_id'])
                question_text = str(row['question_text'])
                answer_text = str(row['answer_text'])
                topic = row.get('topic', '')  # Необязательное поле
                
                # Создаем словарь с дополнительными данными
                # Исключаем обязательные поля
                additional_data = row.drop(['question_id', 'question_text', 'answer_text']).to_dict()
                
                # Конвертируем Timestamp в строку, сохраняя исходный формат
                for key, value in additional_data.items():
                    if isinstance(value, pd.Timestamp):
                        # Сохраняем исходный формат даты MM/d/yyyy
                        additional_data[key] = value.strftime('%m/%d/%Y').lstrip('0').replace('/0', '/')
                
                new_question = Question(
                    id=question_id,
                    question_text=question_text,
                    answer_text=answer_text,
                    topic=topic,
                    additional_data=additional_data
                )
                questions_to_add.append(new_question)
            
            db.session.bulk_save_objects(questions_to_add)
            db.session.commit()
            
            added_count = len(questions_to_add)
            updated_count = 0 # Логика обновления была удалена согласно требованию полной очистки
            
            return jsonify({
                "message": "Файл успешно обработан.",
                "summary": {
                    "total_questions_processed": added_count
                }
            }), 200

        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Произошла ошибка при обработке файла: {str(e)}"}), 500
    else:
        return jsonify({"error": "Неподдерживаемый формат файла. Пожалуйста, загрузите .xlsx файл."}), 400


@api.route('/api/questions', methods=['GET'])
def get_questions():
    """
    Эндпоинт для получения списка вопросов с пагинацией и фильтрацией.
    Параметры:
        page (int): номер страницы (по умолчанию 1)
        filter (str): 'all', 'evaluated', 'unevaluated' (по умолчанию 'all')
    """
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    filter_option = request.args.get('filter', 'all', type=str)

    query = Question.query

    if filter_option == 'evaluated':
        query = query.filter(Question.score.isnot(None))
    elif filter_option == 'unevaluated':
        query = query.filter(Question.score.is_(None))

    pagination = query.order_by(Question.id).paginate(page=page, per_page=per_page, error_out=False)
    questions = pagination.items

    result = []
    for q in questions:
        result.append({
            'id': q.id,
            'question_short': q.question_text[:50] + '...' if len(q.question_text) > 50 else q.question_text,
            'answer_short': q.answer_text[:50] + '...' if len(q.answer_text) > 50 else q.answer_text,
            'topic': q.topic,
            'score': q.score,
            'categories': [c.id for c in q.categories]
        })

    return jsonify({
        'questions': result,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })


@api.route('/api/questions/<int:id>', methods=['GET'])
def get_question_detail(id):
    """
    Эндпоинт для получения полной информации по одному вопросу.
    """
    question = Question.query.get_or_404(id)

    return jsonify({
        'id': question.id,
        'question_text': question.question_text,
        'answer_text': question.answer_text,
        'topic': question.topic,
        'score': question.score,
        'categories': [c.id for c in question.categories],
        'additional_data': question.additional_data
    })

@api.route('/api/questions/<int:id>', methods=['PUT'])
def update_question(id):
    """
    Эндпоинт для обновления оценки и категорий вопроса.
    """
    question = Question.query.get_or_404(id)
    data = request.get_json()

    if 'score' in data:
        # В ТЗ "Согласен / Не согласен". Будем считать 1 - да, 0 - нет.
        # None - оценка не выставлена.
        score_value = data['score']
        if score_value in [0, 1, None]:
             question.score = score_value
        else:
            return jsonify({"error": "Поле 'score' может принимать только значения 0, 1 или null."}), 400

    if 'category_ids' in data:
        # Ожидаем список ID категорий, например [1, 3, 4]
        category_ids = data['category_ids']
        if not isinstance(category_ids, list):
             return jsonify({"error": "Поле 'category_ids' должно быть списком."}), 400
        
        # Очищаем текущие категории и добавляем новые
        question.categories.clear()
        new_categories = Category.query.filter(Category.id.in_(category_ids)).all()
        question.categories.extend(new_categories)

    try:
        db.session.commit()
        return jsonify({
            "message": f"Вопрос с ID {id} успешно обновлен.",
            "question": {
                "id": question.id,
                "score": question.score,
                "categories": [c.id for c in question.categories]
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Произошла ошибка при обновлении: {str(e)}"}), 500


@api.route('/api/categories', methods=['GET'])
def get_categories():
    """
    Эндпоинт для получения списка всех доступных категорий.
    """
    categories = Category.query.all()
    result = [{"id": c.id, "name": c.name} for c in categories]
    
    return jsonify({"categories": result}), 200


@api.route('/api/export', methods=['GET'])
def export_results():
    """
    Эндпоинт для экспорта результатов оценки в Excel.
    Параметры:
        format (str): 'excel' или 'csv' (по умолчанию 'excel')
        filter (str): 'all', 'evaluated', 'unevaluated' (по умолчанию 'all')
    """
    format_type = request.args.get('format', 'excel', type=str)
    filter_option = request.args.get('filter', 'all', type=str)
    
    # Фильтрация как в get_questions()
    query = Question.query
    if filter_option == 'evaluated':
        query = query.filter(Question.score.isnot(None))
    elif filter_option == 'unevaluated':
        query = query.filter(Question.score.is_(None))
    
    questions = query.order_by(Question.id).all()
    
    # Подготовка данных для экспорта
    data = []
    for q in questions:
        row = {
            'question_id': q.id,
            'question_text': q.question_text,
            'answer_text': q.answer_text,
            'score': q.score,
            'score_text': 'Согласен' if q.score == 1 else ('Не согласен' if q.score == 0 else 'Не оценено'),
            'categories': ', '.join([str(c.id) for c in q.categories]),
        }
        # Добавляем дополнительные данные
        if q.additional_data:
            row.update(q.additional_data)
        data.append(row)
    
    if format_type == 'csv':
        return export_csv(data, filter_option)
    else:
        return export_excel(data, filter_option)
