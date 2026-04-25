---
title: HTTP API `/api`
tags:
  - integrations
  - api
date: 2026-04-06
---

# REST API

- База URL на клиенте: `VITE_API_BASE_URL` или `window.location.origin + '/api'` ([[Переменная VITE API BASE задаёт базу API на проде]]).
- Авторизация: заголовок `Authorization: Bearer <jwt>` после [[Telegram Mini App выдаёт JWT после проверки initData]].
- Публичные эндпоинты: например `/api/public/config`, `/api/health`.
- Сущности в клиенте обёрнуты в объект `api` (`src/api/client.js`) — см. [[Клиентский модуль api централизует fetch и сортировки списков]].

Бэкенд: `backend/src/server.js` (маршруты `/api/...`).
