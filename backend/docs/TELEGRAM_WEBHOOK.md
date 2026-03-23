# Вебхук бота: приветствие и рефералы

После `/start` бот отправляет текст и кнопку **«Открыть приложение»** (Mini App).

## Настройка

1. В `backend/.env`:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_BOT_USERNAME` — без `@` (из `getMe`)
   - `PUBLIC_APP_URL` или `FRONTEND_ORIGIN` — **HTTPS** URL фронта (как в BotFather для Web App)
   - `TELEGRAM_WEBHOOK_SECRET` — случайная строка (опционально, но рекомендуется)

2. Укажи вебхук (замени домен и токен):

```bash
curl -sS -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-domain.com/api/telegram/webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
```

3. Nginx должен проксировать `POST /api/telegram/webhook` на Node (порт бэкенда).

## Реферальная ссылка

Формат: `https://t.me/<BOT_USERNAME>?startapp=ref_<userId>`

При первом входе по ссылке `start_param` попадает в `initData` и привязывает пригласившего.

Если пользователь сначала нажал `t.me/bot?start=ref_<id>` в чате, без Mini App, параметр сохраняется в `data.json` → `pending_referrals` до первого входа в приложение.
