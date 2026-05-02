---
title: Telegram webhook не доходит до VPS RU — long polling через прокси
tags:
  - debugging
  - telegram
  - infra
  - networking
date: 2026-05-02
---

# Симптом

`getWebhookInfo` возвращает `last_error_message: "Connection timed out"`. Бот не получает апдейты, `/start` не вызывает welcome.

# Диагноз

VPS в РФ фильтрует/режет входящие соединения от подсетей Telegram. Вебхук в принципе невозможно получать, пока хостинг отдаёт лимиты на входящий трафик из-за рубежа.

# Решение

Перевести бота на **long polling** через `getUpdates`, который мы вызываем сами через имеющийся `TELEGRAM_PROXY` (исходящий канал работает).

- Новый модуль: `backend/src/telegramLongPolling.js`, функция `startTelegramLongPolling`.
- Внутри:
  - использует `ProxyAgent` и `undici` (как `telegramBotApi.js`),
  - на старте вызывает `deleteWebhook`, чтобы убрать конфликт `409`,
  - хранит `offset`, обрабатывает таймауты, повторяет с бэкоффом,
  - каждый апдейт пропускает через общий `handleTelegramStartUpdate(update)` — единая точка обработки и для webhook'а, и для long polling.
- Включается флагом `TELEGRAM_USE_LONG_POLLING=true` в `backend/.env`. Webhook остаётся как fallback для не-РФ деплоев.

# Сопутствующие подводные камни

- `setWebhook` ругался `400 invalid webhook URL`, потому что `DOMAIN` в `.env` был с `https://`, и итоговый URL получался `https://https://...`. Лечится записью домена без протокола.
- При смене токена через @BotFather webhook автоматически снимается; long polling после рестарта сам делает `deleteWebhook`.
- При деплое не должно быть двух процессов одновременно вызывающих `getUpdates` — Telegram отдаст 409.

# Связано

- [[Telegram Mini App выдаёт JWT после проверки initData]]
- [[Прод деплоится через GitHub Actions на VPS]]
