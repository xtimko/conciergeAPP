---
title: Stripe в package.json
tags:
  - integrations
  - payments
  - stripe
date: 2026-04-06
---

# Stripe

В корневом `package.json` есть `@stripe/react-stripe-js` и `@stripe/stripe-js`. Фактическое использование на страницах нужно подтверждать поиском по `src/` — при отсутствии импортов это «задел» или наследие шаблона.

При появлении оплаты связать с [[REST слой висит на префиксе api]] и политикой секретов на бэкенде.
