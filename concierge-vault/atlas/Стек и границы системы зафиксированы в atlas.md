---
title: Стек и границы системы
tags:
  - atlas
  - stack
date: 2026-04-06
---

# Стек

| Слой | Технологии |
|------|------------|
| Фронт | React 18, Vite 6, React Router 6, TanStack Query 5, Tailwind 3, Radix UI, sonner/toast, zod, react-hook-form |
| Бэкенд | Node ESM, Express 4, jsonwebtoken, nanoid, undici (Telegram), dotenv, cors |
| Данные | JSON-файл `backend/data.json` (см. [[Бэкенд Express хранит состояние в data json рядом с кодом]]) |

Границы: фронт не ходит в Telegram напрямую для бизнес-логики — только WebApp SDK; API и бот на сервере. Платёжные SDK (Stripe в `package.json`) — зависимости есть; фактическое использование проверять в коде страниц.

Возврат к оглавлению: [[00-home/index]].
