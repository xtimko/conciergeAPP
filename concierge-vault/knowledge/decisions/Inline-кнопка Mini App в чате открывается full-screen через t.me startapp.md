---
title: Inline-кнопка Mini App из чата открывается full-screen через t.me startapp
tags:
  - decisions
  - telegram
  - mini-app
date: 2026-05-02
---

# Решение

В сообщениях бота для открытия Mini App **во full-screen** используется inline-кнопка-ссылка вида `https://t.me/<TELEGRAM_BOT_USERNAME>?startapp`, а не `inline_keyboard.web_app`.

# Почему

Telegram открывает три типа «веб-апп»-кнопок по-разному:

- `inline_keyboard.web_app` — **half-screen** окно поверх чата (нижняя половина). Часто SPA в этом окне работает криво (белый экран, теряется фокус инпутов).
- `keyboard.web_app` (reply keyboard) — **full-screen**, но меняет нижнюю панель чата на кнопку.
- Menu Button (через @BotFather → *Configure Menu Button*) — **full-screen**.
- Direct-link Mini App `t.me/<bot>?startapp` или `t.me/<bot>/<short_name>` — **full-screen**, тот же режим, что Menu Button. Можно положить в любой `inline_keyboard.url`, и Telegram сам перехватит ссылку.

В welcome после `/start` хочется именно полноэкранного открытия из тела сообщения. Поэтому используем `inline_keyboard.url` с `t.me/<bot>?startapp`.

# Как реализовано

`backend/src/telegramBotApi.js → sendTelegramWelcomeWithWebApp(botToken, chatId, html, webAppUrl, { botUsername })`:

- Если `botUsername` задан → кнопка `{ text, url: 'https://t.me/<botUsername>?startapp' }`.
- Иначе → fallback на `{ text, web_app: { url } }` (half-screen).

Передача username из `server.js` идёт через переменную окружения `TELEGRAM_BOT_USERNAME` (без `@`). Тот же домен фронта должен быть прописан в @BotFather как Mini App URL — Telegram открывает именно его.

# Замечания

- `web_app: { url }` всё ещё нужен как fallback на случай отсутствия username.
- Для длинных диплинков можно использовать `t.me/<bot>/<short_name>?startapp=<param>` — но в нашем сценарии параметризацию `start` обрабатывает сам бот в `handleTelegramStartUpdate` (см. реф-токены).
