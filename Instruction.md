Сейчас напишу подробную инструкцию. Это будет отдельный технический документ для разработчика.

---

# Инструкция по реализации backend-сервиса приложения «Эксплорит»

## Содержание

1. Обзор архитектуры
2. Настройка окружения и структура проекта
3. База данных
4. Аутентификация
5. REST API — модули по порядку реализации
6. Алгоритмический модуль
7. WebSocket-сервер
8. Celery — фоновые задачи
9. Интеграция с Яндекс Сервисами
10. Кэширование Redis
11. Тестирование
12. Развёртывание

---

## 1. Обзор архитектуры

Перед началом реализации важно понять общую картину. Backend состоит из пяти независимых процессов, которые работают одновременно:

**FastAPI-приложение** — основной процесс, обслуживает REST API и WebSocket-соединения. Асинхронный, использует asyncio.

**Celery Worker** — отдельный процесс для фоновых задач: парсинг Яндекс Афиши, обновление POI, отправка push-уведомлений. Работает независимо от FastAPI.

**Celery Beat** — планировщик, запускает задачи воркера по расписанию. Отдельный процесс.

**PostgreSQL + PostGIS** — единственное хранилище долговременных данных. Все геопространственные операции выполняются здесь.

**Redis** — три роли одновременно: кэш горячих данных, хранилище сессий и брокер Pub/Sub для WebSocket.

**Правило взаимодействия**: FastAPI никогда не вызывает Celery напрямую синхронно — только ставит задачи в очередь через `.delay()` или `.apply_async()`. Celery никогда не отвечает клиенту напрямую — только пишет в базу данных или Redis.

---

## 2. Настройка окружения и структура проекта

### 2.1. Требования

```
Python 3.10+
PostgreSQL 15+ с расширением PostGIS 3.3+
Redis 7+
Docker + Docker Compose (для локальной разработки)
```

### 2.2. Переменные окружения

Создай файл `.env` в корне проекта. Никогда не коммить его в репозиторий.

```
# База данных
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/explorit
DATABASE_URL_SYNC=postgresql://user:password@localhost:5432/explorit

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
SECRET_KEY=твой_секретный_ключ_минимум_32_символа
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30

# Яндекс
YANDEX_MAPS_API_KEY=твой_ключ
YANDEX_GEOCODER_API_KEY=твой_ключ
YANDEX_AFISHA_API_KEY=твой_ключ

# Push-уведомления
FCM_SERVER_KEY=твой_ключ
APNS_KEY_ID=твой_ключ
APNS_TEAM_ID=твой_ключ

# Настройки приложения
ENVIRONMENT=development
MAX_ROUTE_POINTS=10
DEFAULT_SEARCH_RADIUS_KM=5
CITY_NAME=Самара
CITY_LAT=53.1959
CITY_LON=50.1002
```

### 2.3. Структура проекта

Строго соблюдай эту структуру — она определяет, где что лежит:

```
explorit-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # точка входа FastAPI
│   ├── config.py                # загрузка переменных окружения
│   ├── database.py              # движок БД, фабрика сессий
│   │
│   ├── models/                  # ORM-модели SQLAlchemy
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── route.py
│   │   ├── poi.py
│   │   ├── event.py
│   │   ├── post.py
│   │   ├── session.py           # GroupSession + SessionMember
│   │   ├── interaction.py
│   │   └── gamification.py
│   │
│   ├── schemas/                 # Pydantic-схемы
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── route.py
│   │   ├── poi.py
│   │   ├── post.py
│   │   ├── session.py
│   │   └── gamification.py
│   │
│   ├── routers/                 # HTTP-обработчики
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── routes.py
│   │   ├── posts.py
│   │   ├── profile.py
│   │   ├── poi.py
│   │   ├── feed.py
│   │   └── gamification.py
│   │
│   ├── services/                # бизнес-логика
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── route_service.py
│   │   ├── geo_service.py
│   │   ├── scoring_service.py
│   │   ├── notification_service.py
│   │   └── gamification_service.py
│   │
│   ├── algorithms/              # алгоритмы маршрутизации
│   │   ├── __init__.py
│   │   ├── point_generator.py
│   │   ├── haversine.py
│   │   ├── astar.py
│   │   ├── two_opt.py
│   │   ├── nearest_neighbor.py
│   │   ├── clustering.py
│   │   └── collaborative_filter.py
│   │
│   ├── websocket/               # WebSocket-сервер
│   │   ├── __init__.py
│   │   ├── handler.py
│   │   └── connection_manager.py
│   │
│   ├── tasks/                   # Celery-задачи
│   │   ├── __init__.py
│   │   ├── celery_app.py
│   │   ├── poi_updater.py
│   │   ├── event_parser.py
│   │   └── notifications.py
│   │
│   ├── integrations/            # адаптеры внешних API
│   │   ├── __init__.py
│   │   ├── yandex_maps.py
│   │   ├── yandex_afisha.py
│   │   └── circuit_breaker.py
│   │
│   └── utils/
│       ├── __init__.py
│       ├── jwt.py
│       ├── hashing.py
│       └── geohash_utils.py
│
├── alembic/                     # миграции БД
│   ├── env.py
│   └── versions/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── load/
│
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env
└── alembic.ini
```

---

## 3. База данных

### 3.1. Порядок реализации

Реализуй модели в этом порядке — каждая следующая зависит от предыдущей:

```
1. User
2. UserProgress
3. POI
4. Event (зависит от POI)
5. Route (зависит от User)
6. Post (зависит от User, Route)
7. GroupSession + SessionMember (зависит от User, Route)
8. Interaction (зависит от User)
9. Follow (зависит от User)
```

### 3.2. Важные детали по каждой модели

**User** — поле `interests` объяви как `ARRAY(String)`. Поле `password_hash` никогда не включай в Pydantic response-схемы — добавь его в `model_config` с `exclude`.

**POI** — поле `location` объяви через GeoAlchemy2: `Column(Geometry("POINT", srid=4326))`. Обязательно создай пространственный индекс:

```sql
CREATE INDEX idx_poi_location ON poi USING GIST(location);
```

Без этого индекса запросы ST_DWithin будут работать в 100+ раз медленнее.

**Route** — поле `geometry` тип `LINESTRING`, поле `points` тип `JSONB`. Структура points:

```json
[
  { "order": 1, "poi_id": "uuid", "lat": 53.19, "lon": 50.1, "name": "..." },
  { "order": 2, "poi_id": "uuid", "lat": 53.2, "lon": 50.11, "name": "..." }
]
```

**Event** — поле `poi_id` nullable — не каждое событие привязано к существующему POI. Всегда проверяй через ST_DWithin(50 метров) при вставке.

**GroupSession** — поле `invite_code` генерируй как случайную строку из 8 символов (только буквы и цифры). Добавь уникальный индекс.

**SessionMember** — поле `last_location` тип `POINT` — обновляется при каждом WebSocket-сообщении в памяти менеджера, в базу пишется батчами раз в 60 секунд.

### 3.3. Миграции

Используй Alembic. Каждое изменение схемы — отдельная миграция. Никогда не редактируй существующие миграции после применения.

```bash
# Создать новую миграцию
alembic revision --autogenerate -m "add_poi_spatial_index"

# Применить все миграции
alembic upgrade head

# Откатить последнюю
alembic downgrade -1
```

После первой миграции вручную добавь расширение PostGIS — autogenerate его не создаёт:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

Добавь это в `env.py` Alembic в функцию `run_migrations_online()` перед запуском миграций.

---

## 4. Аутентификация

### 4.1. Порядок реализации

```
1. hashing.py — функции hash_password и verify_password
2. jwt.py — create_access_token, create_refresh_token, decode_token
3. schemas/auth.py — RegisterRequest, LoginRequest, TokenResponse
4. routers/auth.py — /register, /login, /refresh, /me
5. Dependency get_current_user — используется во всех защищённых роутерах
```

### 4.2. Что важно не забыть

**При регистрации** — проверь уникальность email до хеширования пароля. Если email занят — верни HTTP 409, не 400.

**При логине** — если пользователь не найден или пароль неверен, возвращай одинаковое сообщение «Неверный email или пароль». Никогда не сообщай, что именно неверно — это утечка информации.

**Access Token** — срок жизни 24 часа. Содержимое payload:

```json
{ "sub": "user_uuid", "iat": 1234567890, "exp": 1234567890 }
```

**Refresh Token** — срок жизни 30 дней. Храни хеш refresh-токена в Redis по ключу `refresh:{user_id}` с TTL 30 дней. При использовании токена — инвалидируй старый и выдай новый (rotation).

**Dependency get_current_user** — реализуй два варианта:

- `get_current_user` — бросает HTTP 401 при отсутствии токена (для защищённых эндпоинтов)
- `get_optional_user` — возвращает None при отсутствии токена (для публичных маршрутов с опциональной авторизацией)

---

## 5. REST API — модули по порядку реализации

Реализуй модули именно в этом порядке — каждый следующий зависит от предыдущего.

### 5.1. Модуль Profile (/api/profile)

Самый простой модуль, реализуй первым для проверки базовой архитектуры.

```
GET  /api/profile/me           — профиль текущего пользователя
PUT  /api/profile/me           — обновление профиля
GET  /api/profile/{user_id}    — публичный профиль пользователя
POST /api/profile/follow/{id}  — подписаться
DELETE /api/profile/follow/{id} — отписаться
GET  /api/profile/me/archive   — личный архив маршрутов
```

**Важно**: при обновлении вектора интересов (`interests`) немедленно инвалидируй кэш скоринга в Redis по ключу `score:{user_id}:*`.

### 5.2. Модуль POI (/api/poi)

```
GET /api/poi/          — POI в радиусе от координат
GET /api/poi/{id}      — детали конкретного POI
```

Параметры запроса для GET /api/poi/:

```
lat: float (обязательный)
lon: float (обязательный)
radius_km: float (по умолчанию 5, максимум 50)
categories: list[str] (опциональный)
limit: int (по умолчанию 20, максимум 50)
```

Запрос к базе данных использует ST_DWithin — не ST_Distance. ST_DWithin работает с индексом, ST_Distance — нет.

### 5.3. Модуль Routes (/api/routes)

Самый сложный модуль. Реализуй эндпоинты в таком порядке:

```
GET    /api/routes/            — список маршрутов пользователя
GET    /api/routes/{id}        — маршрут по ID
DELETE /api/routes/{id}        — удаление (только автор)
POST   /api/routes/{id}/save   — сохранить в архив
POST   /api/routes/{id}/publish — опубликовать в каталог
POST   /api/routes/{id}/share  — получить ссылку-приглашение
GET    /api/routes/catalog     — публичный каталог
POST   /api/routes/generate    — генерация (реализуй последним)
```

Эндпоинт `/generate` реализуй последним — он зависит от всего алгоритмического модуля. До его реализации остальные эндпоинты уже должны работать.

Параметры `/generate`:

```json
{
  "lat": 53.1959,
  "lon": 50.1002,
  "radius_km": 5,
  "max_points": 5,
  "categories": ["Культура", "Еда"],
  "transport_mode": "walking",
  "max_duration_min": 120
}
```

**Контроль доступа**: при запросе GET /api/routes/{id} проверяй `is_public`. Если маршрут приватный и запрашивает не автор — HTTP 403.

### 5.4. Модуль Feed (/api/feed)

```
GET  /api/feed/              — лента всех постов
GET  /api/feed/following     — лента подписок
POST /api/posts/             — создать пост
GET  /api/posts/{id}         — пост по ID
DELETE /api/posts/{id}       — удалить (только автор)
POST /api/posts/{id}/like    — лайк / анлайк (toggle)
POST /api/posts/{id}/comment — комментарий
GET  /api/posts/{id}/comments — список комментариев
```

Лента реализуется через курсорную пагинацию, не через offset. Параметры:

```
cursor: str (опциональный, ID последнего поста)
limit: int (по умолчанию 20)
```

Курсорная пагинация работает стабильно при добавлении новых постов, в отличие от offset которая смещается. Реализуй через `WHERE created_at < cursor_timestamp ORDER BY created_at DESC`.

### 5.5. Модуль Gamification (/api/gamification)

```
GET /api/gamification/progress     — прогресс текущего пользователя
GET /api/gamification/leaderboard  — таблица лидеров
GET /api/gamification/challenges   — активные челленджи
```

Начисление XP реализуй не в роутерах, а как отдельную функцию `gamification_service.award_xp(user_id, action_type, db)`. Вызывай её из роутеров после успешного выполнения действия. Это позволит легко менять логику начисления без правки роутеров.

Типы действий и значения XP:

```python
XP_REWARDS = {
    "route_completed": 100,
    "new_place_discovered": 30,   # умножается на число новых мест
    "cooperative_route": 40,
    "streak_5_days": 20,
    "post_published": 15,
    "first_visit_category": 50,   # первое посещение новой категории
}
```

После начисления XP проверяй условие повышения уровня. Пороги уровней задай в конфиге как список. При повышении уровня — ставь в очередь Celery задачу отправки push-уведомления.

Названия уровней для Самары (реализуй как словарь `{level: name}`):

```python
LEVEL_NAMES = {
    1: "Новый житель",
    2: "Любопытный горожанин",
    3: "Исследователь улиц",
    5: "Знаток района",
    8: "Самарский пешеход",
    12: "Хранитель города",
    16: "Легенда Самары",
    20: "Мастер маршрутов",
}
```

---

## 6. Алгоритмический модуль

Реализуй каждый файл независимо. Все функции принимают чистые данные — без зависимостей от FastAPI или SQLAlchemy.

### 6.1. haversine.py

Реализуй первым — используется везде.

Функция принимает две пары координат (lat1, lon1, lat2, lon2) и возвращает расстояние в метрах. Важно: все угловые величины переводи в радианы через `math.radians` перед вычислениями.

### 6.2. point_generator.py

Функция `generate_random_point(lat, lon, radius_km, db_session)`:

1. Генерируй `u = random.uniform(0, 1)`
2. Вычисляй `d = radius_km * math.sqrt(u)` — расстояние в км
3. Генерируй `theta = random.uniform(0, 2 * math.pi)` — азимут
4. Переводи угловое расстояние: `delta = d / 6371` (радиан)
5. Вычисляй новые координаты через формулы сферической тригонометрии
6. Вызывай `is_point_forbidden(lat, lon, db_session)` через PostGIS
7. Если точка запрещена — повторяй, максимум 50 попыток
8. Если 50 попыток исчерпаны — поднимай исключение `PointGenerationError`

### 6.3. nearest_neighbor.py

Функция `nearest_neighbor(start_lat, start_lon, points)`:

- `points` — список словарей с ключами `lat`, `lon`, `id`, `score`
- Алгоритм: жадный выбор ближайшей непосещённой точки на каждом шаге
- Возвращает упорядоченный список points

### 6.4. two_opt.py

Функция `two_opt(points)`:

- Принимает упорядоченный список points от nearest_neighbor
- Итерирует пары рёбер, переворачивает сегмент если это сокращает маршрут
- Порог улучшения: 0.1 метра (избегает бесконечных итераций на числовом шуме)
- Максимум итераций: 100 (защита от зависания на больших маршрутах)
- Возвращает оптимизированный список points

### 6.5. astar.py

Функция `build_path(start, end, transport_mode)`:

- Запрашивает маршрут через Яндекс Маршрутизатор API
- Кэширует результат в Redis по ключу `route:{geohash_start}:{geohash_end}:{mode}` с TTL 24 часа
- Возвращает список координат (полилинию) и расстояние в метрах
- При ошибке API — возвращает прямую линию между точками (деградация)

### 6.6. scoring_service.py

Функция `score_and_rank(poi_list, events, user, visited_ids)`:

Веса факторов:

```python
W_CATEGORY = 0.40
W_RATING   = 0.25
W_FRESHNESS = 0.20
W_EVENT    = 0.15
```

Вычисление каждого фактора:

- `category_match`: 1.0 если категория POI в `user.interests`, иначе 0.2
- `rating_norm`: `min(poi.rating / 5.0, 1.0)`
- `freshness`: `1.0 / (1.0 + visited_ids.get(poi.id, 0))`
- `event_bonus`: значение из таблицы категорий событий (0.5–1.0), 0.0 если нет события

**Важно**: загружай `visited_ids` единым запросом до цикла, не внутри него — иначе N+1 запросов к базе.

### 6.7. collaborative_filter.py

Реализуй последним — наиболее сложный модуль.

Функция `get_cf_boost(user_id, poi_ids, db)`:

1. Загружай матрицу взаимодействий из кэша Redis (`cf_matrix` ключ)
2. Если кэш пустой — вычисляй из базы данных таблицы Interaction
3. Находи топ-10 похожих пользователей по косинусному сходству
4. Вычисляй взвешенный буст для каждого POI из списка
5. Возвращай словарь `{poi_id: boost_value}`, где boost_value в диапазоне [0, 0.2]

Матрица обновляется Celery-задачей раз в час. Не пересчитывай её при каждом запросе.

---

## 7. WebSocket-сервер

### 7.1. Структура сообщений

Все сообщения — JSON. Клиент и сервер используют единый формат:

```json
{
  "type": "location | joined | left | checkpoint | route_completed | error",
  "payload": {}
}
```

Типы от клиента к серверу:

```json
// Обновление геопозиции
{"type": "location", "payload": {"lat": 53.19, "lon": 50.10}}

// Штатное отключение
{"type": "leave", "payload": {}}
```

Типы от сервера к клиенту:

```json
// Геопозиция другого участника
{"type": "location", "payload": {"user_id": "uuid", "nickname": "...", "color": "#FF5733", "lat": 53.19, "lon": 50.10}}

// Участник присоединился
{"type": "joined", "payload": {"user_id": "uuid", "nickname": "...", "color": "#FF5733"}}

// Участник ушёл
{"type": "left", "payload": {"user_id": "uuid"}}

// Достигнута точка маршрута
{"type": "checkpoint", "payload": {"point_index": 2, "point_name": "...", "xp_awarded": 30}}

// Маршрут завершён
{"type": "route_completed", "payload": {"distance_km": 4.2, "duration_min": 58, "total_xp": 250}}
```

### 7.2. ConnectionManager

Синглтон-класс. Хранит:

```python
# {session_id: {user_id: {"ws": WebSocket, "nickname": str, "color": str, "last_location": dict}}}
active_connections: dict[str, dict[str, dict]]
```

Цвета участников назначай из фиксированного списка по порядку подключения:

```python
PARTICIPANT_COLORS = ["#FF5733", "#33A8FF", "#33FF57", "#FF33A8", "#FFD700"]
```

### 7.3. Логика обработчика

При подключении (`/ws/session/{invite_code}`):

1. Верифицируй JWT из query-параметра `token`
2. Найди сессию по `invite_code` в базе данных
3. Зарегистрируй соединение в менеджере
4. Подпишись на канал Redis `session:{session_id}`
5. Отправь новому участнику текущие геопозиции всех остальных
6. Разошли всем остальным сообщение `joined`

При получении сообщения `location`:

1. Обнови `last_location` в памяти менеджера
2. Опубликуй в Redis канал `session:{session_id}`
3. Проверь расстояние до следующей точки маршрута через Haversine
4. Если расстояние < 50 метров — обработай достижение точки

При достижении точки маршрута:

1. Пометь точку как посещённую в базе данных
2. Поставь в очередь Celery задачу начисления XP
3. Разошли всем участникам сообщение `checkpoint`
4. Если это последняя точка — разошли `route_completed` и завершай сессию

При разрыве соединения (`WebSocketDisconnect`):

1. Сохрани время разрыва в Redis: `disconnect:{session_id}:{user_id}` с TTL 30 секунд
2. Подожди 30 секунд (через asyncio.sleep) перед оповещением остальных
3. Если пользователь переподключился за эти 30 секунд — восстанови сессию без уведомлений
4. Если нет — разошли `left` и удали из менеджера

### 7.4. Redis Pub/Sub для масштабирования

Каждый экземпляр сервера запускает фоновую корутину `redis_listener`, которая:

1. Подписывается на все каналы `session:*`
2. При получении сообщения — находит локальные WebSocket-соединения участников группы
3. Отправляет им сообщение

Это обеспечивает работу при нескольких экземплярах сервера за балансировщиком.

---

## 8. Celery — фоновые задачи

### 8.1. Конфигурация

```python
# tasks/celery_app.py
CELERY_BEAT_SCHEDULE = {
    "update-poi": {
        "task": "tasks.poi_updater.update_poi",
        "schedule": crontab(minute=0, every=6),  # каждые 6 часов
    },
    "parse-events": {
        "task": "tasks.event_parser.parse_yandex_afisha",
        "schedule": crontab(hour=3, minute=0),   # каждый день в 3:00
    },
}
```

### 8.2. Задача parse_yandex_afisha

Алгоритм работы:

1. Запросить события на 30 дней вперёд через адаптер Яндекс Афиши
2. Для каждого события — сделать upsert по ключу `(source="yandex_afisha", external_id)`
3. Если у события нет координат — геокодировать адрес через Яндекс Геокодер
4. Попытаться связать с POI через ST_DWithin(50 метров)
5. Деактивировать события с истёкшей датой окончания (`is_active = False`)
6. Инвалидировать кэши Redis для затронутых геозон
7. Записать статистику в таблицу `task_logs`

Между запросами страниц Яндекс Афиши делай паузу `await asyncio.sleep(0.5)`. При HTTP 429 — экспоненциальная задержка от 1 до 30 секунд.

### 8.3. Задача send_push_notification

Не планируется по расписанию — вызывается из кода через `.delay()`.

Параметры: `user_id`, `title`, `body`, `data` (dict).

Логика:

1. Загрузить push-токен пользователя и платформу из базы данных
2. Если платформа Android — отправить через FCM
3. Если платформа iOS — отправить через APNs
4. При ошибке доставки — пометить токен как невалидный

Дедупликация: перед отправкой проверяй Redis ключ `push_sent:{user_id}:{notification_type}:{object_id}` с TTL 5 минут. Если ключ существует — не отправляй.

---

## 9. Интеграция с Яндекс Сервисами

### 9.1. Яндекс Геокодер

Базовый URL: `https://geocode-maps.yandex.ru/1.x/`

Параметры запроса:

```
apikey: твой ключ
geocode: адрес строкой
format: json
results: 1
```

Из ответа извлекай `GeoObjectCollection.featureMember[0].GeoObject.Point.pos` — строка вида `"lon lat"` (порядок именно такой — сначала долгота).

Кэшируй результат в Redis: `geocode:{md5(address)}` с TTL 30 дней.

### 9.2. Яндекс Маршрутизатор

Базовый URL: `https://api.routing.yandex.net/v2/route`

Параметры:

```
apikey: твой ключ
waypoints: "lat,lon|lat,lon"
mode: walking | driving
```

Из ответа извлекай `route.legs[].steps[].polyline.points` — список координат для отрисовки маршрута. Суммируй `route.legs[].distance.value` для общей длины.

Кэшируй: `routing:{geohash6_start}:{geohash6_end}:{mode}` с TTL 24 часа.

### 9.3. Яндекс Афиша

API не имеет публичной документации. Используй следующий подход:

Базовый URL: `https://afisha.yandex.ru/api/events`

Параметры:

```
city: samara
limit: 20
offset: 0
period: month
```

Из ответа извлекай для каждого события:

- `id` — внешний идентификатор
- `title` — название
- `tags[].name` — категории (маппируй на внутреннюю классификацию)
- `scheduleInfo.dateBegin`, `scheduleInfo.dateEnd` — даты
- `place.coordinates.longitude`, `place.coordinates.latitude` — координаты
- `place.address` — адрес (если нет координат)

Если координаты отсутствуют — геокодируй адрес. Если адрес тоже пуст — пропускай событие.

### 9.4. Circuit Breaker

Реализуй как декоратор для методов адаптеров:

```python
@circuit_breaker(failure_threshold=5, recovery_timeout=60)
async def get_route(self, start, end, mode):
    ...
```

Хранение состояния выключателя — в Redis:

```
cb_state:{service_name}  →  "closed" | "open" | "half_open"
cb_failures:{service_name}  →  число (TTL 60 секунд)
```

При открытом выключателе — немедленно поднимай `CircuitBreakerOpenError` не делая запрос к сервису.

---

## 10. Кэширование Redis

Единый реестр всех ключей кэша для понимания что и где лежит:

```python
CACHE_KEYS = {
    # POI в геозоне
    "poi_zone": "poi:{geohash6}:{categories_hash}",       # TTL: 6 часов

    # Маршрут между точками
    "route_path": "routing:{gh6_start}:{gh6_end}:{mode}", # TTL: 24 часа

    # Геокодирование
    "geocode": "geocode:{address_md5}",                    # TTL: 30 дней

    # Скоринг для пользователя в зоне
    "scoring": "score:{user_id}:{geohash6}",               # TTL: 15 минут

    # Матрица коллаборативной фильтрации
    "cf_matrix": "cf_matrix",                              # TTL: 1 час

    # Профиль пользователя
    "user_profile": "user:{user_id}",                      # TTL: 15 минут

    # Push дедупликация
    "push_sent": "push_sent:{user_id}:{type}:{object_id}", # TTL: 5 минут

    # Сессия (JWT refresh)
    "refresh_token": "refresh:{user_id}",                  # TTL: 30 дней

    # WebSocket Pub/Sub каналы
    "ws_channel": "session:{session_id}",                  # без TTL

    # Состояние Circuit Breaker
    "cb_state": "cb_state:{service_name}",                 # TTL: 60 секунд
}
```

**Правило инвалидации**: при любом изменении данных немедленно удаляй соответствующие ключи. Не жди истечения TTL. Используй `redis.delete()` или `redis.scan_iter()` с паттерном для групповой инвалидации.

---

## 11. Тестирование

### 11.1. Модульные тесты — запускай после реализации каждого алгоритма

Для `haversine.py`:

- Расстояние между одной точкой и собой = 0
- Расстояние Самара–Москва ≈ 1042 км (проверяй с погрешностью 1%)
- Симметричность: dist(A,B) == dist(B,A)

Для `point_generator.py`:

- Все 1000 сгенерированных точек находятся внутри заданного радиуса
- Распределение равномерное (тест хи-квадрат)
- При радиусе 0 — исключение

Для `two_opt.py`:

- Результат не длиннее входного маршрута
- Маршрут из 1 точки — возвращается без изменений
- Маршрут из 2 точек — возвращается без изменений

### 11.2. Интеграционные тесты

Используй отдельную тестовую базу данных. Создавай её через фикстуру pytest с автоматическим накатом миграций и откатом после каждого теста.

Обязательно протестируй:

- Регистрация с существующим email → HTTP 409
- Запрос к защищённому эндпоинту без токена → HTTP 401
- Удаление чужого маршрута → HTTP 403
- Генерация маршрута с валидными координатами → HTTP 200, корректный GeoJSON
- Запрос POI через ST_DWithin — все результаты в пределах радиуса

### 11.3. Нагрузочный тест

Запускай через Locust после полной реализации:

```bash
locust -f tests/load/locustfile.py --headless -u 1000 -r 50 --run-time 60s
```

Целевые показатели:

- POST /api/routes/generate — P95 ≤ 3 секунды
- GET /api/feed — P95 ≤ 1 секунда
- WebSocket — задержка доставки ≤ 200 мс

---

## 12. Развёртывание

### 12.1. docker-compose.yml

Минимальный рабочий состав:

```yaml
services:
  nginx:
    depends_on: [api]

  api:
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    depends_on: [api, redis]
    command: celery -A app.tasks.celery_app worker --loglevel=info

  beat:
    depends_on: [worker]
    command: celery -A app.tasks.celery_app beat --loglevel=info

  db:
    image: postgis/postgis:15-3.3
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
```

### 12.2. Порядок первого запуска

```bash
# 1. Поднять базу данных и Redis
docker-compose up -d db redis

# 2. Применить миграции
docker-compose run --rm api alembic upgrade head

# 3. Первоначальный парсинг событий Яндекс Афиши
docker-compose run --rm worker python -m app.tasks.event_parser --initial

# 4. Запустить всё
docker-compose up -d
```

### 12.3. Обновление без даунтайма

```bash
# Пересобрать образ
docker-compose build api

# Перезапустить только api (БД и Redis не трогать)
docker-compose up -d --no-deps api
```

### 12.4. Что проверить после запуска

```bash
# API отвечает
curl http://localhost/api/health

# PostGIS установлен
docker-compose exec db psql -U postgres -d explorit -c "SELECT PostGIS_version();"

# Celery worker работает
docker-compose exec worker celery -A app.tasks.celery_app inspect active

# Redis доступен
docker-compose exec redis redis-cli ping
```

---

## Приложение — порядок реализации всего проекта

Если делать с нуля — придерживайся этого порядка:

```
День 1–2:   docker-compose с PostgreSQL + PostGIS + Redis
            config.py, database.py
            Все ORM-модели + первая миграция Alembic

День 3–4:   Аутентификация (hashing, JWT, роутер /auth)
            Роутер /profile

День 5–6:   haversine.py, point_generator.py
            Роутер /poi с PostGIS-запросами

День 7–9:   nearest_neighbor.py, two_opt.py
            scoring_service.py
            Роутер /routes (без /generate)

День 10–11: Интеграция Яндекс Маршрутизатор (astar.py)
            Роутер /routes/generate

День 12–13: Лента и посты (/feed, /posts)
            Геймификация

День 14–15: WebSocket-сервер
            Redis Pub/Sub

День 16–17: Celery — парсинг Яндекс Афиши
            Push-уведомления

День 18–19: collaborative_filter.py
            Полный цикл тестирования

День 20:    Нагрузочные тесты
            Финальная сборка Docker
```
