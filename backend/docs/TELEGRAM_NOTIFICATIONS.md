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

- **Одно сообщение:** если `image_url` — публичный `http(s)://`, только **sendPhoto** с подписью (до 1024 символов). Иначе **sendMessage** (до 4096).
- Текст без «эмодзи в каждой строке»: номер, позиция, бренд · размер, категория, сумма, срок, статус, баллы, реферер, комментарий; при `data:` — строка про просмотр фото в приложении.

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
