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

## Что шлёт бот

Только **`order_created`** и **`order_status_changed`** (канал `orders`). Отдельных писем про бонусы нет.

## Создание заказа (`order_created`)

- Одно сообщение: **sendPhoto** + подпись (HTML, `parse_mode`), если есть публичный `http(s)://` у фото; иначе **sendMessage**.
- Подпись/текст: **HTML**, жирное выделение ключевых блоков; пользовательский текст экранируется (`escapeHtml`).
- Баллы: строки **«Баллов к списанию: N»** / **«Баллов к начислению: N»** (без «по условиям заказа»).

## Смена статуса (`order_status_changed`)

- Шаблон: заголовок, название и размер, номер заказа жирным, строка `Статус -> …` со статусом жирным.

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
