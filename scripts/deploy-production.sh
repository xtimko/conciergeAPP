#!/usr/bin/env bash
# Полный деплой: фронт (dist) + бэкенд (src + package.json) + npm install на сервере + restart.
# Автоматически то же делает GitHub Actions: .github/workflows/deploy-production.yml
#
# Настройки (можно переопределить переменными окружения):
#   DEPLOY_HOST          — хост SSH (по умолчанию 194.67.101.182)
#   DEPLOY_USER          — пользователь SSH (root)
#   DEPLOY_SSH_PORT      — порт SSH (22)
#   DEPLOY_REMOTE_BACKEND — каталог бэкенда на сервере, где лежат package.json и src/
#   DEPLOY_REMOTE_WEB    — каталог статики (содержимое dist: index.html, assets/)
#
# Пример:
#   chmod +x scripts/deploy-production.sh
#   ./scripts/deploy-production.sh
#   REMOTE_WEB=/var/www/concierge ./scripts/deploy-production.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

HOST="${DEPLOY_HOST:-194.67.101.182}"
USER="${DEPLOY_USER:-root}"
PORT="${DEPLOY_SSH_PORT:-22}"
REMOTE_BACKEND="${DEPLOY_REMOTE_BACKEND:-/opt/concierge/backend}"
REMOTE_WEB="${DEPLOY_REMOTE_WEB:-/opt/concierge/web}"

SSH=(ssh -p "$PORT" "$USER@$HOST")
RSYNC=(rsync -az --delete -e "ssh -p $PORT")

echo "==> npm run build (фронт → dist/)"
npm run build

echo "==> rsync backend/src → $USER@$HOST:$REMOTE_BACKEND/src/"
"${RSYNC[@]}" ./backend/src/ "$USER@$HOST:$REMOTE_BACKEND/src/"

echo "==> rsync backend/package.json + package-lock.json"
"${RSYNC[@]}" ./backend/package.json ./backend/package-lock.json "$USER@$HOST:$REMOTE_BACKEND/"

echo "==> mkdir -p для статики на сервере"
"${SSH[@]}" "mkdir -p '$REMOTE_WEB'"

echo "==> rsync dist/ → $USER@$HOST:$REMOTE_WEB/"
"${RSYNC[@]}" ./dist/ "$USER@$HOST:$REMOTE_WEB/"

echo "==> на сервере: npm install, проверка server.js, restart concierge-api"
"${SSH[@]}" bash -c "set -e
cd '$REMOTE_BACKEND'
if command -v npm >/dev/null 2>&1; then
  npm ci --omit=dev 2>/dev/null || npm install --omit=dev
fi
node --check src/server.js
sudo systemctl restart concierge-api
if command -v nginx >/dev/null 2>&1; then
  sudo nginx -t && sudo systemctl reload nginx || true
fi
echo '--- journalctl concierge-api (последние 50 строк) ---'
sudo journalctl -u concierge-api -n 50 --no-pager
"

echo "==> готово."
