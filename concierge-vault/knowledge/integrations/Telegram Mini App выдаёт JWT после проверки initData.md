---
title: Вход через Telegram Mini App
tags:
  - integrations
  - telegram
  - auth
date: 2026-04-06
---

# Telegram → JWT

- Клиент (`src/api/client.js`) отправляет на `/api/auth/telegram` тело с `initData` / `initDataUnsafe` из `window.Telegram.WebApp`.
- Сервер (`telegramAuth.js`) проверяет подпись `initData` через `TELEGRAM_BOT_TOKEN`.
- В ответе выдаётся JWT; клиент кладёт его в `localStorage` под ключом `concierge_jwt`.
- Режим `ALLOW_DEV_TELEGRAM_LOGIN` ослабляет проверки для разработки.

Ошибка без Telegram: «Telegram Mini App is required for login».

Связано: [[REST слой висит на префиксе api]], [[Роль админа сверяется с data json при каждом запросе]].
