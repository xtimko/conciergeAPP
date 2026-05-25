---
title: Liquid Glass редизайн с fallback для старых iOS
tags:
  - session
  - design
  - liquid-glass
  - ios
date: 2026-05-25
---

# Сессия 2026-05-25

## Что сделано

Полный визуальный редизайн приложения в стиле Apple Liquid Glass (iOS 26+) с fallback на текущий glassmorphism для старых iOS / слабого железа.

### 1. Бэкап (для отката)
- Тег `pre-liquid-glass` на `94d82f1`
- Ветка `backup/pre-liquid-glass`
- Откат: `git reset --hard pre-liquid-glass`

### 2. Детектор платформы (`src/lib/platformDetection.js`)
- `Telegram.WebApp.platform` → ios | android | desktop
- UA-парсинг iOS major-версии
- `CSS.supports()` для проверки `backdrop-filter`, `mask-image`, `color-mix`
- Ставит классы на `<html>`: `platform-ios`, `ios-26-plus`, `liquid-glass-enabled`
- `initPlatformDetection()` вызывается из `main.jsx`

### 3. CSS Liquid Glass (`src/styles/liquid-glass.css`)
Активируется только при `.liquid-glass-enabled`:
- Спекулярные блики на верхней грани (`::before` слой)
- Refraction edge (radial-gradient в `background`)
- Тонкий SVG noise (`::after` с fractal-noise filter)
- Усиленные тени с lg-elevated
- Утилиты: `.lg-subtle`, `.lg-elevated`, `.lg-pill`, `.lg-display`, `.lg-eyebrow`, `.lg-number`
- Анимация `.lg-enter` (`fade-up` с easing 0.22,1,0.36,1)
- Уважение `prefers-reduced-motion`

### 4. Компоненты
- **`GlassCard`** — varianты `default | elevated | subtle`, `hover`, `animated`
- **`Header`** — премиум tracking `0.32em`, тень при скролле, кнопка «Админ» через `.lg-subtle`
- **`BottomNav`** — активный таб через `.lg-subtle` с inset highlight
- **`BonusCard`** — hero elevated, число 2.75rem extralight, ChevronRight в lg-subtle кружке
- **`OrderRow`** — `.lg-subtle` плашка, статус-чип с цветной точкой вместо Badge
- **`Home`** — hero greeting, refined spacing, eyebrow для секций
- **`Profile`** — hero аватар + ФИО, bonus elevated card
- **`Referral`** — hero аватар + заголовок, elevated блок ссылки
- **`AdminDashboard`** — иконки в `.lg-subtle` кружках, числа `.lg-display`

## Коммит

- `aad440c` — feat(design): полный редизайн в стиле Liquid Glass + fallback

## Логика активации Liquid Glass

| Платформа | Liquid Glass | Что видит |
|---|---|---|
| iOS 26+ | ✅ | Полный материал: блики, refraction, noise, анимации |
| iOS ≤ 25 | ❌ | Текущий glassmorphism из `index.css` |
| Android (modern Chromium) | ✅ | То же что iOS 26+ |
| Telegram Desktop | ✅ | То же |

Условие в коде: `isIos26Plus || platform === 'desktop' || (Android и есть mask-image)`.

## Решения

- Two-layer CSS: базовый `index.css` остался нетронутым, новый `liquid-glass.css` поверх. Откатить эффект можно убрав класс с `<html>`.
- `::before` для спекуляра, `::after` для noise — z-index 0, контент z-index 1.
- Анимации только на способных устройствах (`.liquid-glass-enabled .lg-enter`).
- `transform: translateY(-1px)` на hover в desktop — лёгкий lift эффект.

## Что НЕ трогали (намеренно)

- Settings, Onboarding, Admin страницы (AdminOrders/Clients/Finance) — структура и логика. Если редизайн зайдёт, в следующей сессии докинем.
- Формы и поля ввода (Profile форма) — оставлены как есть, чтобы не сломать сохранение.
- OrderDetailSheet, диалоги — следующая итерация.
- Tailwind config, цвета — нетронуты.

## Откат

```
git reset --hard pre-liquid-glass
git push --force origin main   # если уже задеплоено
```

Или мягче — закомментить `import '@/styles/liquid-glass.css'` в `main.jsx`. Тогда новый материал отключён, но компоненты с premium-классами `.lg-*` останутся работать с базовым `.glass`.
