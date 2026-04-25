---
title: Паттерн api client
tags:
  - patterns
  - frontend
date: 2026-04-06
---

# Единый HTTP-клиент

Файл `src/api/client.js` экспортирует объект `api`:

- `api.auth.*` — `/me`, обновление профиля, онбординг, реферальная статистика, logout;
- `api.entities.User` / `Order` — list, filter, CRUD;
- `api.public.config` — публичный конфиг (имя бота и т.д.);
- таймаут fetch, обработка сетевых ошибок, JWT из `localStorage`.

Списки заказов сортируются по `created_date` убыванием в одном месте — не дублировать на страницах.

Связь: [[REST слой висит на префиксе api]].
