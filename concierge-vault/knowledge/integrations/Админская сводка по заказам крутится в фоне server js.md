---
title: Admin order digest в Telegram
tags:
  - integrations
  - telegram
  - admin
date: 2026-04-06
---

# Периодическая сводка для админов

Модуль `backend/src/adminOrderDigest.js`; подключение через `scheduleAdminOrderDigest` из `server.js`.

Назначение:

- заказы с приближающимся дедлайном по ETA;
- заказы в статусе **confirmed** дольше заданного интервала (напоминание сменить этап).

Переменные окружения: `TELEGRAM_ADMIN_CHAT_IDS`, `ADMIN_ORDER_DIGEST_*` (интервалы, пороги, дедупликация).

Связь: [[Telegram Bot шлёт клиентам статусы заказов по notify_preferences]].
