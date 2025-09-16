# TODO List

## Backend Improvements
- [ ] Рефакторинг upload_file() - разбить на отдельные функции:
  - [ ] validate_file()
  - [ ] validate_excel_structure()
  - [ ] check_duplicates()
  - [ ] check_empty_values()
  - [ ] save_questions_to_db()
- [ ] Добавить unit тесты для каждой функции
- [ ] Протестировать все API endpoints
- [ ] Настроить frontend
- [ ] Вернуться к Docker после завершения разработки

## Completed ✅
- [x] Настроена PostgreSQL локально
- [x] Исправлены названия колонок в routes.py
- [x] Добавлена валидация дубликатов с понятными сообщениями
- [x] Настроен Git с коммитами
