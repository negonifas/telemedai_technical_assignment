import pandas as pd
import io
from flask import send_file, jsonify
from datetime import datetime

def export_csv(data, filter_option):
    """
    Экспорт данных в CSV формат
    """
    try:
        import pandas as pd
        import io
        
        df = pd.DataFrame(data)
        
        # Создаем CSV в памяти
        output = io.StringIO()
        df.to_csv(output, index=False, encoding='utf-8')
        output.seek(0)
        
        # Создаем response
        response = send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'medical_evaluation_{filter_option}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
        
        return response
        
    except Exception as e:
        return jsonify({'error': f'Ошибка экспорта CSV: {str(e)}'}), 500


def export_excel(data, filter_option):
    """
    Экспорт данных в Excel формат
    """
    try:
        import pandas as pd
        import io
        
        df = pd.DataFrame(data)
        
        # Создаем Excel в памяти
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Основные данные
            df.to_excel(writer, sheet_name='Результаты оценки', index=False)
            
            # Статистика на отдельном листе
            stats_data = [
                {'Категория': 'Всего вопросов', 'Количество': len(data)},
                {'Категория': 'Согласен (score=1)', 'Количество': sum(1 for row in data if row['score'] == 1)},
                {'Категория': 'Не согласен (score=0)', 'Количество': sum(1 for row in data if row['score'] == 0)},
                {'Категория': 'Не оценено (score=null)', 'Количество': sum(1 for row in data if row['score'] is None)},
                {'Категория': 'Процент оцененных', 'Количество': f"{((len(data) - sum(1 for row in data if row['score'] is None)) / len(data) * 100):.1f}%" if len(data) > 0 else "0%"}
            ]
            stats_df = pd.DataFrame(stats_data)
            stats_df.to_excel(writer, sheet_name='Статистика', index=False)
        
        output.seek(0)
        
        # Создаем response
        response = send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'medical_evaluation_{filter_option}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        )
        
        return response
        
    except Exception as e:
        return jsonify({'error': f'Ошибка экспорта Excel: {str(e)}'}), 500
