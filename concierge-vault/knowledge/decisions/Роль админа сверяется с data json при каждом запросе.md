---
title: Admin middleware читает актуальную роль из БД
tags:
  - decisions
  - security
date: 2026-04-06
---

# Решение: не доверять полю `role` в JWT

В `server.js` функция `adminRequired` загружает пользователя из `readDb()` и проверяет `user.role === 'admin'`, а не только payload JWT.

**Почему:** роль могла измениться после выдачи токена; иначе возможна рассинхронизация и утечка админских прав или наоборот блокировка.

Связано: [[Telegram Mini App выдаёт JWT после проверки initData]].
