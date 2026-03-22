# Уведомления клиенту в Telegram

## Слои

1. **`telegramBotApi.js`** — только `sendMessage` (и прокси через `undici`).
2. **`notificationMessages.js`** — тексты (RU).
3. **`clientNotifications.js`** — реестр типов, каналы, `notify_preferences`, точка входа `notifyClientTelegram`.
4. **`telegramNotify.js`** — поиск пользователя по заказу, `notifyOrderInTelegramChat` → вызывает `notifyClientTelegram`.

## Каналы (`user.notify_preferences`)

| Ключ        | По умолчанию | Что планируется |
|------------|--------------|-----------------|
| `orders`   | `true`       | Заказы: создание, смена статуса |
| `marketing`| `false`      | Акции, рассылки (реестр + вызовы добавишь позже) |
| `system`   | `true`       | Важные системные сообщения |

## Как добавить новый тип

1. В `clientNotifications.js` в `NOTIFICATION_REGISTRY` добавить, например:

```js
promo_10: {
  channel: "marketing",
  buildText: ({ text }) => `🎁 ${text}`,
},
```

2. Вызвать:

```js
import { notifyClientTelegram } from "./clientNotifications.js";

notifyClientTelegram(TELEGRAM_BOT_TOKEN, user, {
  type: "promo_10",
  order: undefined,
});
```

Для маркетинга пользователь должен иметь `notify_preferences.marketing === true`.

3. При необходимости добавить ключи в `mergeNotifyPreferences` / настройки на фронте.
