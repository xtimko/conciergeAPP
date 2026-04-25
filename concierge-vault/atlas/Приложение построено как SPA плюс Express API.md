---
title: Приложение построено как SPA плюс Express API
tags:
  - architecture
  - atlas
date: 2026-04-06
---

# Архитектура: SPA + API

- **Клиент:** React 18, маршрутизация в [[Маршруты клиента и админки разведены по роли admin]], UI на Radix + Tailwind, сборка [[Сборка фронта выполняется Vite с алиасом @]].
- **Сервер:** Express в `backend/src/server.js`, префикс маршрутов `/api`, CORS на `FRONTEND_ORIGIN`.
- **Данные:** по умолчанию [[Бэкенд Express хранит состояние в data json рядом с кодом]]; MySQL — опционально ([[MySQL описан как опциональная миграция из JSON]]).

Поток входа: [[Telegram Mini App выдаёт JWT после проверки initData]] → токен в `localStorage` (`concierge_jwt`) → все запросы с `Authorization: Bearer`.

См. также [[Стек и границы системы зафиксированы в atlas]].
