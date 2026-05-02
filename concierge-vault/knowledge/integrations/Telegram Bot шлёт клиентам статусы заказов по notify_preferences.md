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

- `telegramBotApi.js` — транспорт (`sendMessage`, прокси через undici при `TELEGRAM_PROXY`); там же `sendTelegramWelcomeWithWebApp` для inline‑кнопки Mini App.
- `notificationMessages.js` — тексты RU, экранирование HTML; для `delivered` добавлена строка про начисленные баллы.
- `clientNotifications.js` — реестр типов, каналы `orders` / `marketing` / `system` / `referrals`.
- `telegramNotify.js` — связка заказ → пользователь → `notifyClientTelegram`.
- `referralNotifications.js` — отдельный модуль для писем рефереру (см. [[Реферальные уведомления вынесены в отдельный модуль referralNotifications]]).

События:

- **создание заказа** и **смена статуса** (канал `orders`),
- **онбординг приглашённого / заказ друга / зачисление баллов после доставки** (канал `referrals`).

Настройки пользователя: `notify_preferences` (миграция в `server.js` добивает поле `referrals: true` существующим пользователям).

Транспорт апдейтов от Telegram:

- webhook на `/api/telegram/webhook` (когда хост принимает входящие из подсетей Telegram),
- fallback long polling при `TELEGRAM_USE_LONG_POLLING=true` — см. [[Telegram webhook не доходит до VPS RU — long polling через прокси]].

Welcome после `/start` — текстовое сообщение с inline‑кнопкой‑ссылкой `t.me/<bot>?startapp` (full‑screen Mini App, см. [[Inline-кнопка Mini App в чате открывается full-screen через t.me startapp]]). Обложку (фото) пробовали добавить через `sendPhoto`, но Telegram‑серверы не смогли скачать картинку с российского VPS (`failed to get HTTP URL content`, тот же геоблок, что у входящих webhook). Решено оставить только текст; вернуться к обложке можно позже через CDN вне РФ или multipart-загрузку файла.

Связано: [[Админская сводка по заказам крутится в фоне server js]].
