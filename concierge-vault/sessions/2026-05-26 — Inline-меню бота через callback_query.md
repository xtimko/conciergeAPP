---
title: Inline-меню бота через callback_query — чат не засоряется
tags:
  - session
  - telegram-bot
  - ux
date: 2026-05-26
---

# Сессия 2026-05-26

## Проблема

ReplyKeyboard (кнопки «◆ Мой профиль», «◆ Мои заказы», «◆ Реферальная программа», «→ Открыть приложение») при каждом нажатии генерировала **новое сообщение** от бота. После 5-10 нажатий чат был забит. Контраст с уже реализованным механизмом обновлений по заказу: там одно сообщение редактируется через `editMessageText` + `deleteMessage` для статусов, что работало хорошо.

## Решение — как делают топовые боты

Полная замена ReplyKeyboardMarkup → **InlineKeyboardMarkup** + `callback_query`:

1. `/start` → одно сообщение с inline-кнопками под ним
2. Клиент нажимает кнопку → приходит `callback_query` с `data: "menu:profile"` (или other)
3. Бот **редактирует то же сообщение** через `editMessageText` с новым контентом и новой клавиатурой (например с кнопкой «← Назад в меню»)
4. В чате одно «живое» меню, которое переключает разделы

## Изменения в коде

### `backend/src/telegramBotApi.js`
- Новая функция `answerCallbackQuery(token, callbackQueryId, options)` — подтверждает нажатие inline-кнопки, убирает индикатор загрузки у клиента.

### `backend/src/telegramLongPolling.js`
- `allowed_updates` расширен с `["message"]` до `["message","callback_query"]` (URL-encoded).

### `backend/src/telegramBotCommands.js` (полностью переписан)
- Константы `CB.MAIN | CB.PROFILE | CB.ORDERS | CB.REFERRAL` — callback_data для inline-кнопок.
- `buildMainMenu(botUsername, appUrl)` — главное меню (4 кнопки, последняя — url на `t.me/<bot>?startapp`).
- `buildBackMenu(botUsername, appUrl)` — подменю с «← Назад в меню» + «Открыть Concierge».
- `buildSection(data, db, telegramId, opts)` — по callback_data строит `{ text, replyMarkup }`.
- `buildWelcome(db, telegramId, opts)` — для `/start`.
- `handleCallbackQuery(callbackQuery, db, opts)` — точка входа для callback_query.
- `handleBotMessage(message, db, opts)` — текстовые команды `/profile`, `/orders`, `/referral`, `/menu`, `/help` + **обратная совместимость** для старой ReplyKeyboard: если нажмут — вернёт `{ ..., removeReplyKeyboard: true }`.

### `backend/src/server.js`
- Импорты обновлены: `editTelegramMessageText`, `answerCallbackQuery`, `handleCallbackQuery`, `buildWelcome`.
- `handleTelegramUpdate(message)`:
  - `/start` → одно сообщение с inline-меню + одноразовое микросообщение «·» с `remove_keyboard: true` (чтобы убрать старую ReplyKeyboard у клиентов с прошлой версии).
  - Команды и старые тексты ReplyKeyboard → через `handleBotMessage`. Если пришла старая клавиатура, сначала шлём «·» с `remove_keyboard`, потом основное.
- Новая функция `handleTelegramCallback(callbackQuery)` — редактирует существующее сообщение и подтверждает callback.
- Webhook (`POST /api/telegram/webhook`) и long polling роутят оба типа апдейтов: `message` → `handleTelegramUpdate`, `callback_query` → `handleTelegramCallback`.

## Коммит

- `7e77949` — feat(bot): inline-меню через callback_query — чат не засоряется

## Поведение

| Сценарий | Раньше | Теперь |
|---|---|---|
| `/start` | Welcome + установка ReplyKeyboard (2 сообщения) | Welcome с inline-меню + «·» remove_keyboard (2, второе минимальное) |
| Нажатие кнопки | Новое сообщение в чате | Редактирование текущего меню — чат чистый |
| Нажатие старой ReplyKeyboard | Новое сообщение | Одно сообщение с inline-меню + remove_keyboard |
| Команда `/profile`/`/orders`/`/referral` | Новое сообщение | Сообщение с inline-меню (с «← Назад» внутри) |
| `/menu` | Не было | Открывает главное inline-меню |

## Why это правильно

- **Меньше шума в чате**: одно сообщение-меню вместо лавины. Премиум-вайб.
- **Натуральный UX Telegram**: топовые боты (Wallet, Stars, OpenAI и др.) делают через inline-меню под сообщениями.
- **Совместимо со старыми клиентами**: висящая ReplyKeyboard автоматически уберётся при первом взаимодействии.
- **Кнопка «Открыть Concierge»** — url-кнопка `t.me/<bot>?startapp` (full-screen Mini App), не требует callback.

## Технические нюансы

- `InlineKeyboardMarkup` и `ReplyKeyboardMarkup` в одном сообщении **взаимоисключающие** — поэтому remove_keyboard шлём отдельным «·»-сообщением.
- В Telegram Bot API один `reply_markup` на сообщение: либо inline, либо reply, либо force_reply, либо remove.
- `answerCallbackQuery` обязателен — без него у клиента «крутится» индикатор загрузки до 30с таймаута.
