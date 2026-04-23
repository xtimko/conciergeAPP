# Concierge — клиентский сервис

Фронт: **Vite + React** (`npm run dev`). API: **Express** в каталоге `backend/` (`npm run dev` внутри `backend/`).

## Переменные окружения

В корне проекта (для сборки фронта) можно задать `.env` или `.env.local`:

- `VITE_API_BASE_URL` — полный URL до префикса `/api` без слэша в конце, например `https://example.com/api`. Если не задан, в браузере используется `window.location.origin + "/api"`.

Подробности по бэкенду и Telegram — в `backend/docs/`.

## Команды

```bash
npm install          # фронт
npm run dev          # dev-сервер Vite
npm run build        # прод-сборка → dist/

cd backend && npm install && npm run dev   # API на порту из PORT или 8787
```

## Деплой на прод (одним скриптом)

**1. Сначала GitHub** (чтобы история и бэкап кода были в репо):

```bash
git add -A
git status
git commit -m "Кратко: что изменилось"
git push origin main
```

**2. Потом прод** — скрипт собирает фронт, заливает `dist/` и `backend/src/` (+ `package.json` бэкенда), на сервере делает `npm ci`/`npm install` и `systemctl restart concierge-api`. Пути по умолчанию как у вашего VPS; при необходимости задайте переменные (см. комментарии в скрипте).

```bash
./scripts/deploy-production.sh
# пример: другой каталог под nginx
DEPLOY_REMOTE_WEB=/var/www/concierge ./scripts/deploy-production.sh
```

**3. Автодеплой из GitHub** — после `push` в `main` workflow [`.github/workflows/deploy-production.yml`](.github/workflows/deploy-production.yml) собирает фронт и делает то же, что скрипт (rsync + рестарт). В репозитории нужны secrets `DEPLOY_SSH_PRIVATE_KEY` и `DEPLOY_HOST` (остальные — в комментариях в начале workflow). Ручной запуск: вкладка **Actions** → **Deploy production** → **Run workflow**.
