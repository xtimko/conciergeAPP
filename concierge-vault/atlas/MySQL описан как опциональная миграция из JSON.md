---
title: MySQL как опция
tags:
  - atlas
  - database
  - mysql
date: 2026-04-06
---

# MySQL не обязателен

Документ `backend/README-MYSQL.md` описывает переход с `data.json` на MySQL: создание БД, `schema.sql`, переменные `MYSQL_*`, скрипт миграции `npm run migrate:json` (в доке; наличие в `package.json` нужно проверять при включении).

Текущий код в репозитории ориентирован на **JSON** (`/api/health` → `db: "json"`).

Связь: [[Бэкенд Express хранит состояние в data json рядом с кодом]].
