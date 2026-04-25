---
title: Деплой CI и SSH
tags:
  - debugging
  - deploy
date: 2026-04-06
---

# Проблема: Permission denied при деплое

GitHub Actions не может ввести пароль интерактивно. Нужен **приватный ключ** в secret `DEPLOY_SSH_PRIVATE_KEY`, публичная часть — в `~/.ssh/authorized_keys` на сервере.

Симптом: `Permission denied (publickey,password)`.

Решение: см. [[Прод деплоится через GitHub Actions на VPS]].
