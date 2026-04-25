---
title: Уведомления в Telegram о заказах
tags:
  - integrations
  - telegram
  - notifications
date: 2026-04-06
---

# Клиентские уведомления

Архитектура слоёв описана в `backend/docs/TELEGRAM_NOTIFICATIONS.md`:

- `telegramBotApi.js` — транспорт (`sendMessage`, прокси через undici при `TELEGRAM_PROXY`).
- `notificationMessages.js` — тексты RU, экранирование HTML.
- `clientNotifications.js` — реестр типов, каналы `orders` / `marketing` / `system`.
- `telegramNotify.js` — связка заказ → пользователь → `notifyClientTelegram`.

Реализованы события **создание заказа** и **смена статуса** (канал `orders`). Настройки пользователя: `notify_preferences`.

Связано: [[Админская сводка по заказам крутится в фоне server js]].
