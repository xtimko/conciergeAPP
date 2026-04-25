---
title: Генерация CLI- и CON- номеров
tags:
  - patterns
  - backend
date: 2026-04-06
---

# Идентификаторы для людей и экспорта

В `backend/src/db.js`:

- `nextClientPublicId` — формат `CLI-000001` по максимуму существующих;
- `nextOrderPublicId` — `CON-` + 6 цифр, без коллизий;
- `ensureUserPublicIds` — миграция для старых пользователей без `public_id`;
- реферальный токен ссылок `CON` + символы ([[Реферальные ссылки используют токены CON и start param ref]]).

Хранилище: [[Бэкенд Express хранит состояние в data json рядом с кодом]].
