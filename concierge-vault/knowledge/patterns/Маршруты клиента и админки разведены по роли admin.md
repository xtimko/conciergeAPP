---
title: Маршрутизация по роли
tags:
  - patterns
  - frontend
  - routing
date: 2026-04-06
---

# Admin vs клиент

- Общие страницы: `/Home`, `/Profile`, `/Referral`, `/Settings`, `/onboarding`.
- Блок `/AdminDashboard`, `/AdminOrders`, `/AdminFinance`, `/AdminClients` ренерится только если `user.role === 'admin'`.
- Лейауты: `ClientLayout` (нижняя навигация, хедер) и `AdminLayout`.

Источник роли — актуальный пользователь из [[React Query использует queryKey me для профиля]].
