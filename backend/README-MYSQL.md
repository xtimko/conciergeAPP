# MySQL + MySQL Workbench (опционально)

Сейчас бэкенд по умолчанию хранит данные в **`data.json`**. Ниже — если захочешь снова перейти на MySQL.

1. **Запусти MySQL** (локально или на сервере).
2. В **MySQL Workbench**: подключись к инстансу → вкладка *Query*:
   ```sql
   CREATE DATABASE IF NOT EXISTS concierge
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE concierge;
   ```
3. **Файл → Open SQL Script** → выбери `backend/schema.sql` → выполни (молния).
4. Скопируй `backend/.env.example` → `backend/.env`, укажи:
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
5. **Импорт старых данных из JSON** (если был `data.json`):
   ```bash
   cd backend && npm run migrate:json
   ```
6. Запуск API:
   ```bash
   cd backend && npm run dev
   ```

Проверка: `GET http://localhost:8787/api/health` → `{ "ok": true, "db": "mysql" }`.

В Workbench те же хост/порт/пользователь/пароль, что в `.env` — таблицы `users` и `orders` будут совпадать с тем, что читает приложение.
