---
title: Деплой продакшена
tags:
  - atlas
  - deploy
  - ci
date: 2026-04-06
---

# Деплой

- **CI:** `.github/workflows/deploy-production.yml` — на `push` в `main` и вручную (*Run workflow*).
- **Шаги:** `npm ci` → `npm run build` → `rsync` `backend/src`, `backend/package*.json`, `dist/` на VPS → на сервере `npm ci`/`npm install` в каталоге бэкенда → `systemctl restart concierge-api` → опционально `nginx reload`.
- **Секреты GitHub:** `DEPLOY_SSH_PRIVATE_KEY`, `DEPLOY_HOST`; опционально пользователь, порт, пути (`DEPLOY_REMOTE_*`).
- **Локально:** `scripts/deploy-production.sh` делает то же с машины разработчика.

Пути по умолчанию: `/opt/concierge/backend`, `/opt/concierge/web`. `.env` на сервере в бэкенде **не** заливается из репозитория.

Проблемы входа по SSH: [[GitHub Actions требует SSH ключ а не пароль сервера]].
