Краткая инструкция и описание для развёртывания проекта через Docker.

## Краткое описание архитектуры

Компоненты:
- `db` — PostgreSQL, хранит таблицы с вопросами, категориями и результатами оценки. Данные персистятся в Docker volume.
- `backend` — Flask-приложение (SQLAlchemy), обрабатывает загрузку XLSX, API для вопросов/статистики/обновления баллов, запускается под gunicorn.
- `frontend` — React (Create React App), собирается в статические файлы и сервируется nginx в production-образе.

Взаимодействие:
- Браузер -> `frontend` (статические страницы и JS).
- `frontend` -> `backend` по HTTP (REST API).
- `backend` -> `db` по TCP (PostgreSQL), используя параметры из `.env`/`docker-compose.yml`.
- `docker-compose` создаёт общую сеть, где `backend` обращается к базе по хосту `db`.

Файлы, которые имеют отношение к развёртыванию:
- `docker-compose.yml` — оркестрация сервисов.
- `backend/Dockerfile` — сборка образа backend.
- `frontend/Dockerfile` — multi-stage сборка React + nginx.
- `.env` — переменные окружения (оригинал).
- `backend/.dockerignore` — исключения для билд-контекста.

## Требования
- Docker Engine и Docker Compose (v2).
- Рабочий каталог: папка с `docker-compose.yml` (в проекте — `medical_eval_app/`).

## Клонирование проекта
Создайте папку с проектом. Назовите ее например `medical_eval_app`
Выполните в папке: 
```bash
git clone git@github.com:negonifas/telemedai_technical_assignment.git
cd telemedai_technical_assignment
```

## Быстрый старт — команды
Выполнять из каталога, где лежит `docker-compose.yml`.

Поднять сервисы (в фоне):

```bash
docker compose up -d --build
```
и искать его по http://localhost:3000/

Остановить сервисы:

```bash
docker compose down
```

Остановить и удалить тома (удалит БД / все данные):

```bash
docker compose down -v
```

Пересобрать и поднять только конкретный сервис (пример — backend):

```bash
docker compose up -d --build backend
```

Перезапустить один сервис без пересборки:

```bash
docker compose restart backend
```

Посмотреть состояние контейнеров:

```bash
docker compose ps
```

Просмотр логов (всё):

```bash
docker compose logs -f
```

Логи конкретного сервиса (пример — db):

```bash
docker compose logs -f db
```

Войти в shell контейнера (пример — backend):

```bash
docker compose exec backend /bin/bash
# или если нет bash:
docker compose exec backend /bin/sh
```

## Проверки работоспособности

1) Проверка, что Postgres принял соединения (внутри контейнера `db`):

```bash
docker compose exec db pg_isready -U ${POSTGRES_USER:-medical_user}
```

2) Подключиться к БД через psql (в контейнере db):

```bash
docker compose exec db psql -U ${POSTGRES_USER:-medical_user} -d ${POSTGRES_DB:-medical_eval}
```

3) Проверка health endpoint backend (если проброшен порт 5001):

```bash
curl -v http://localhost:5001/health
```

Если порты отличаются — смотрите `docker-compose.yml` или используйте `docker compose port backend 5001`.

## Типичные проблемы и решения

- Если на фронте в браузере пишет проблемы с сетью:
  Побовать поднять отдельно бэк
  ```bash
  docker compose up -d --build backend
  ```

- Если `docker compose up` падает с ошибкой привязки порта 5432 — это значит, что на хосте уже запущен Postgres. Решения:
  - Остановите локальный системный Postgres: `sudo systemctl stop postgresql` (в Linux), или
  - Измените проброс порта в `docker-compose.yml` (хост:контейнер) на другой хост-порт.

- Race-condition: backend пытается выполнить `db.create_all()` или подключиться к БД до того, как Postgres готов принять соединения. Симптом — в логах backend psycopg2 OperationalError: connection refused.
  - Варианты решения:
    1) Подождать, когда `db` станет готов и перезапустить backend:

```bash
docker compose exec db pg_isready -U medical_user -d medical_eval
docker compose restart backend

## Команды для отладки и чистки

- Удалить все неиспользуемые образы/контейнеры (освободить место):

```bash
docker system prune -a
```

- Полная очистка проекта (контейнеры, образы созданные compose, тома):

```bash
docker compose down --rmi all -v
```


