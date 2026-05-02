---
title: Дом Concierge
tags:
  - meta
  - home
date: 2026-04-06
---

# Concierge — база знаний

Мини-приложение Telegram для клиентов и веб-админка на том же репозитории. Точка входа для навигации по заметкам.

## Протокол работы

- **Старт сессии:** читать этот файл и [[Текущие приоритеты]]; по теме — заметки в `knowledge/` / `atlas/`. Подробно: [[Протокол сессии для агента и vault]].
- **Финал по команде «сохрани сессию»:** см. [[Протокол сессии для агента и vault]] (sessions, приоритеты, decisions, debugging, обновление index).

## Карта разделов

- [[Стек и границы системы зафиксированы в atlas]]
- [[Текущие приоритеты]]
- **Atlas:** см. папку `atlas/` — [[Приложение построено как SPA плюс Express API]], [[Прод деплоится через GitHub Actions на VPS]]
- **Интеграции:** `knowledge/integrations/` — [[Telegram Mini App выдаёт JWT после проверки initData]], [[Telegram Bot шлёт клиентам статусы заказов по notify_preferences]], [[REST слой висит на префиксе api]]
- **Решения:** `knowledge/decisions/` — [[Inline-кнопка Mini App в чате открывается full-screen через t.me startapp]], [[Реферальные уведомления вынесены в отдельный модуль referralNotifications]], [[sendPhoto multipart fallback на сервере если Telegram не качает URL]]
- **Отладка:** `knowledge/debugging/` — [[Telegram webhook не доходит до VPS RU — long polling через прокси]], [[Mini App 502 после деплоя — Blob undici и data URL в заказе]]
- **Паттерны:** `knowledge/patterns/`
- **Продукт:** `knowledge/business/`
- **Сессии:** `sessions/`
- **Входящее:** `inbox/`

Репозиторий: фронт в корне (`src/`), API в [[Бэкенд Express хранит состояние в data json рядом с кодом]].
