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

## Создание заказа (`order_created`)

- Сначала **sendPhoto** (если `image_url` — публичный `http(s)://`), подпись — кратко (номер, название, цена, статус).
- Затем **sendMessage** с полным текстом: товар, бренд, размер, категория, цена, срок, статус, баллы клиента после доставки, бонус пригласившему (если есть), комментарий, напоминание про фото в приложении при `data:` URL.

## Как добавить новый тип

1. В `NOTIFICATION_REGISTRY` — либо `buildText`, либо async-функция `send` (как у `order_created`).

```js
promo_10: {
  channel: "marketing",
  buildText: ({ text }) => `🎁 ${text}`,
},
```

2. Вызов: `await notifyClientTelegram(TELEGRAM_BOT_TOKEN, user, { type: "promo_10", ... })`.

3. Для маркетинга пользователь должен иметь `notify_preferences.marketing === true`.
