---
title: TanStack Query и профиль
tags:
  - patterns
  - frontend
  - react-query
date: 2026-04-06
---

# `queryKey: ['me']`

В `App.jsx`, `ProfileGate`, `ThemeInitializer` повторно используется один и тот же ключ запроса `['me']` и `api.auth.me()` для:

- определения админских маршрутов;
- редиректа на [[Маршруты клиента и админки разведены по роли admin]] онбординга;
- начальной темы и языка.

`initialData` из `AuthContext` уменьшает мигание загрузки.
