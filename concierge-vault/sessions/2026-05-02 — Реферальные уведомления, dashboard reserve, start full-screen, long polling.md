---
title: 2026-05-02 — Реферальные уведомления, dashboard reserve, /start full-screen, long polling
tags:
  - session
  - telegram
  - notifications
  - referrals
  - admin
  - ui
date: 2026-05-02
---

## Контекст

Большой набор доработок поверх клиентских уведомлений и админки:
- Закрыть промежуточные точки реферальной воронки уведомлениями.
- Показать в админ-дашборде «замороженные» баллы по активным заказам.
- Перенести триггер админского уведомления о новом клиенте на завершение онбординга.
- Сделать корректное приветствие после `/start` с full-screen Mini App.
- Подружить Telegram-апдейты с российским VPS (вебхук блокировался на входящих).

## Что сделано

### Реферальные уведомления (новый модуль)

- `backend/src/referralNotifications.js`:
  - `notifyReferrerInviteeRegistered` — рефереру, когда приглашённый прошёл онбординг.
  - `notifyReferrerFriendOrdered` — когда друг оформил заказ (без названия и `oid`, только сумма будущих баллов).
  - `notifyReferrerDeliveryBonus` — когда заказ друга доставлен и баллы зачислены.
- В `server.js` добавлены вызовы:
  - `POST /api/users/complete-onboarding` → `notifyReferrerInviteeRegistered` + туда же перенесён `notifyAdminsNewClient` (с `auth/telegram` снят).
  - `POST /api/orders` → `notifyReferrerFriendOrdered`.
  - `PATCH /api/orders/:id` (`status === "delivered"`) → `notifyReferrerDeliveryBonus`.
- В `notificationMessages.js` для `delivered` добавлена строка про начисленные баллы; «Вы» с большой буквы.
- В `clientNotifications.js` / `db.js` / `Settings.jsx` / `i18n.js` добавлен канал `referrals` в `notify_preferences` (по умолчанию `true`), миграция в `server.js` подтягивает его существующим пользователям.

### Админ-дашборд: резерв активных баллов

- `src/pages/AdminDashboard.jsx`: вычисление `bonusReserveInFlight` из недоставленных заказов; в плитке «Баллы клиентов» рендерятся два значения — `На счетах (клиенты)` и `Резерв по активным заказам`.

### Админ-уведомление о новом клиенте

- `backend/src/adminNotifyRegistration.js`:
  - сигнатура `notifyAdminsNewClient(botToken, db, user)`.
  - В тексте приоритет `@username` и Telegram ID (вместо email), такие же поля показываем для реферера.
- Триггер перенесён с `auth/telegram` на `complete-onboarding`. Сама запись клиента в `data.json` остаётся при первом входе через initData (это валидированное Telegram‑устройство), но «новый клиент» в админ-чате теперь = «прошёл регистрацию».

### `/start` — full-screen Mini App

- В welcome теперь inline-кнопка-ссылка `https://t.me/<TELEGRAM_BOT_USERNAME>?startapp` (открывает Mini App в full-screen, как Menu Button), а не `inline_keyboard.web_app` (он всегда half-screen).
- Если username не задан, используется fallback на старую `web_app`-кнопку.
- Логика `/start` вынесена в `handleTelegramStartUpdate` и переиспользуется webhook'ом и long polling.

### Long polling для российского VPS

- Telegram блокировал входящий webhook (`Connection timed out` в `getWebhookInfo`).
- Добавлен `backend/src/telegramLongPolling.js`: `getUpdates` через существующий `TELEGRAM_PROXY`, обработка 409 (висит webhook) с автоматическим `deleteWebhook`, восстановление `offset`.
- Запускается, если `TELEGRAM_USE_LONG_POLLING=true`. Webhook-роут сохранён как fallback.

### Мелочь по UI

- Кнопка «Написать для заказа» на `Home.jsx` стала auto-width: `inline-flex w-auto max-w-[90vw] px-5 py-4`.

### Welcome — только текст (фото откатили)

- Текст приветствия переписан под бренд (тон «Вы», 24/7, описание выкупа/доставки, 3 буллета, призыв к кнопке).
- Пробовали отправлять обложку через `sendPhoto` с URL `${PUBLIC_APP_URL}/welcome.png`. На проде получили `Bad Request: failed to get HTTP URL content` — серверы Telegram не смогли скачать картинку с VPS в РФ (тот же геоблок, что мешал webhook). Закомитили multipart-вариант (загрузка файла напрямую + кэш `file_id`) — он бы решал проблему, но решено пока отказаться от обложки целиком.
- В `server.js` удалены `WELCOME_PHOTO_URL`/`WELCOME_PHOTO_PATH` и передача `photoUrl/photoPath`; в `sendTelegramWelcomeWithWebApp` опции остались на будущее, но сейчас не используются.
- Файл `public/welcome.png` удалён.
- Возврат к обложке — через CDN вне РФ (Cloudflare Images / S3+CloudFront / Cloudinary) или multipart-загрузку файла с сервера.

## Где в коде

- `backend/src/referralNotifications.js` (new), `telegramLongPolling.js` (new).
- `backend/src/server.js` — точки вызова уведомлений, миграция `notify_preferences`, `handleTelegramStartUpdate`, запуск long polling, передача `TELEGRAM_BOT_USERNAME` в welcome.
- `backend/src/telegramBotApi.js` — `sendTelegramWelcomeWithWebApp` принимает `{ botUsername }` и переключается на `t.me/<bot>?startapp` (опция `photoUrl` оставлена в API на будущее, но сейчас не используется).
- `backend/src/adminNotifyRegistration.js`, `clientNotifications.js`, `notificationMessages.js`, `db.js`.
- `src/pages/AdminDashboard.jsx`, `src/pages/Home.jsx`, `src/pages/Settings.jsx`, `src/lib/i18n.js`.

## Решения, оформленные отдельно

- [[Inline-кнопка Mini App в чате открывается full-screen через t.me startapp]]
- [[Реферальные уведомления вынесены в отдельный модуль referralNotifications]]

## Отладка

- [[Telegram webhook не доходит до VPS RU — long polling через прокси]]

## Деплой

- Кнопка `/start` правится в этом же сабмите: `backend/src/telegramBotApi.js` + `server.js`. После пуша в `main` — workflow **Deploy production**.
- На сервере должны быть заданы `TELEGRAM_BOT_USERNAME`, `PUBLIC_APP_URL` (HTTPS), `TELEGRAM_USE_LONG_POLLING=true` (если webhook не пробивается).
