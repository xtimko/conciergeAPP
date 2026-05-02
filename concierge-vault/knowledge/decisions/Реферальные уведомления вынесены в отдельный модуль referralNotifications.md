---
title: Реферальные уведомления вынесены в отдельный модуль referralNotifications
tags:
  - decisions
  - telegram
  - notifications
  - referrals
date: 2026-05-02
---

# Решение

Все Telegram-сообщения, относящиеся к реферальной воронке, живут в `backend/src/referralNotifications.js` и вызываются из `server.js` в трёх точках:

1. `POST /api/users/complete-onboarding` → `notifyReferrerInviteeRegistered(botToken, db, invitee)`.
2. `POST /api/orders` (если у клиента есть `referred_by`) → `notifyReferrerFriendOrdered(botToken, db, order)`.
3. `PATCH /api/orders/:id` (`status === "delivered"`, `referrer_bonus > 0`) → `notifyReferrerDeliveryBonus(botToken, db, order)`.

# Почему отдельный модуль, а не `clientNotifications`

- Это **другая аудитория** — реферер, а не клиент-владелец заказа. У него своё поле `notify_preferences.referrals`.
- Бизнес-сообщение реферера не должно содержать чужих PII (название заказа, его `oid`) — это явное требование владельца. Поэтому шаблоны строже, чем общие `formatOrderStatusMessageRu`.
- Триггер `delivered` начисляет баллы и затем отправляет рефереру сумму — событие не пересекается с клиентским delivered.

# Контракт сообщений

- В тексте: `@username` или Telegram ID, без email.
- Личное обращение «Вы» с большой буквы.
- Сумма баллов и причина начисления указываются явно.
- В `notifyReferrerFriendOrdered` указываем только сумму будущих баллов, без названия товара/услуги и без `oid`.

# Канал

- В `notify_preferences` добавлен ключ `referrals` (default `true`).
- Миграция в `server.js` дописывает `referrals: true` пользователям без поля.
- В `Settings.jsx` доступен тумблер «Рефералы (друзья, баллы)»; перевод — `i18n.notifyReferrals`.

# Связано

- [[Telegram Bot шлёт клиентам статусы заказов по notify_preferences]]
- [[Реферальные ссылки используют токены CON и start param ref]]
