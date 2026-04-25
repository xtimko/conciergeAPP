---
title: Хранилище data.json
tags:
  - atlas
  - database
date: 2026-04-06
---

# БД: `backend/data.json`

- Файл создаётся автоматически при первом обращении (`db.js`), путь логируется в консоль.
- Структура: `users`, `orders`, `pending_referrals` (рефералы до регистрации).
- При битом JSON делается бэкап `*.corrupt-<timestamp>` и восстанавливается пустая схема — см. `readDb()`.
- Публичные идентификаторы: клиенты `CLI-000001`, заказы `CON-XXXXXX` — генераторы в [[Бэкенд Express хранит состояние в data json рядом с кодом]] реализованы в `db.js`.

Health-check: `GET /api/health` возвращает `{ ok: true, db: "json" }`.

Альтернатива: [[MySQL описан как опциональная миграция из JSON]].
