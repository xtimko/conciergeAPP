---
title: 2026-05-02 — Аудит безопасности (Express API) и сохранение vault
tags:
  - session
  - security
date: 2026-05-02
---

## Контекст

- Запрос: обзор безопасности проекта (SPA + Express + JWT + Telegram Mini App + `data.json` + деплой GitHub Actions).
- Отдельно: команда «сохрани сессию» в Ask mode — файлы vault не менялись; повтор в Agent mode.

## Итоги аудита (кратко)

Приоритетные направления:

- **JWT**: не допускать прод без `JWT_SECRET`; дефолт `dev-secret-change-me` — критичный риск.
- **Телеграм-вход**: флаг `ALLOW_DEV_TELEGRAM_LOGIN` не должен быть включён в проде (обход проверки `initData`).
- **Клиент**: JWT в `localStorage` → при XSS возможна кража сессии; укоротить TTL, CSP/минимизация XSS, со временем рассмотреть httpOnly-cookie-подход.
- **API**: нет rate limiting; большой лимит JSON body (`32mb`) — риск DoS; точечные лимиты и лимиты на `/api/auth/telegram`, webhook.
- **Webhook**: `TELEGRAM_WEBHOOK_SECRET` желательно обязателен в проде.
- **Админ**: bootstrap «первый пользователь = admin» — операционный риск; `PATCH /api/users/:id` без allowlist полей — усилить приоритетно при работе с продом.
- **Хранение**: `data.json` без атомарной записи/блокировок — гонки и целостность; права на файл и бэкапы на VPS.
- **CI/CD**: SSH через `ssh-keyscan` без pin fingerprint — усилить при желании (known_hosts в секретах).

Детали см. в переписке сессии и коде `backend/src/server.js`, `backend/src/telegramAuth.js`, `backend/src/db.js`, `src/api/client.js`, `.github/workflows/deploy-production.yml`.

## Vault

- Создана эта заметка; обновлён [[Текущие приоритеты]].
