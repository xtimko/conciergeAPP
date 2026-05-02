---
title: Mini App 502 после деплоя — Blob undici и data URL в заказе
tags:
  - debugging
  - telegram
  - nginx
  - node
date: 2026-05-02
---

# Симптомы

1. **Приложение не открывается**, nginx отдаёт **502**; `concierge-api` не поднимается.
2. Или: **создание заказа с фото** падает с **502** при сохранении.

# Причины

## A) Процесс API не стартует

В `telegramBotApi.js` для multipart использовался `import { Blob } from "undici"`. В актуальных версиях Node/`undici` **нет экспорта `Blob`** → `SyntaxError` при загрузке модуля, systemd перезапускает или процесс мёртв → **502** на все запросы к API.

**Исправление:** `import { Blob } from "node:buffer"`; `FormData` из `undici` оставить.

## B) Только при сохранении заказа с «картинкой»

В поле «URL изображения» вставили **data:image/...;base64,...** из буфера. Тело `POST /api/orders` становится очень большим; **nginx** (`client_max_body_size`, часто ~1 MB) обрывает запрос → клиент видит **502** (не всегда 413).

**Исправление:** хранить только **короткий https://** на файл; на сервере — отсечь слишком длинный `image_url` (**400** + текст), подсказка в админ-форме.

# Проверка на сервере

```bash
sudo systemctl status concierge-api
sudo journalctl -u concierge-api -n 40 --no-pager
```

Искать `SyntaxError` / `Blob` / `undici`.
