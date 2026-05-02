---
title: 2026-05-02 — Фото в Telegram заказа (multipart), лимит image_url, фикс Blob
tags:
  - session
  - telegram
  - backend
  - admin
  - deploy
date: 2026-05-02
---

## Контекст

Клиенту в Telegram не приходило фото в сообщении о созданном заказе: `sendPhoto` с JSON и полем `photo: <URL>` качают **серверы Telegram** с CDN; `TELEGRAM_PROXY` на VPS влияет только на запросы к `api.telegram.org`, не на эту загрузку.

Параллельно: попытка добавить превью картинок через `/api/media/proxy` и фронт была **откачена** — Mini App перестала открываться (502).

## Что сделано (код)

### Multipart только в backend (`telegramBotApi.js`)

- После неудачного `sendPhoto` по URL бэкенд сам качает файл (`fetchImageForTelegramUpload`: сначала через `TELEGRAM_PROXY`, затем direct), затем `sendPhoto` как **multipart** с `Blob` + `FormData` (undici).
- Фронт и отдельный endpoint превью **не добавлялись** в финальной версии.

### Импорт `Blob`

- В Node 24+/undici **`Blob` не экспортируется из `undici`** → при старте процесса падение: `does not provide an export named 'Blob'`, nginx → 502, приложение «не открывается».
- Исправление: `import { Blob } from "node:buffer"`; `FormData` остаётся из `undici`.

### Заказы: 502 при сохранении с «фото»

- Огромные строки `data:image/...` в поле URL раздувают JSON; nginx часто режет тело (~1 MB) → **502**.
- В `server.js`: лимит длины `image_url` (~120k символов) → **400** с понятным текстом; уведомления Telegram после create/status в **`setImmediate`**, чтобы ответ API уходил раньше долгих вызовов.
- В `ImageUploadField.jsx`: короткая подсказка — вставлять **https:// ссылку**, не буфер обмена.

## Статус

После фикса `Blob` и деплоя всё заработало (подтверждено пользователем).

## Связанные заметки

- [[Mini App 502 после деплоя — Blob undici и data URL в заказе]]
- Решения по превью в Mini App отложены; для фото в чате достаточно multipart на бэкенде.
