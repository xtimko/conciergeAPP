---
title: VITE_API_BASE_URL
tags:
  - integrations
  - frontend
  - env
date: 2026-04-06
---

# База API для фронта

- В `.env` / `.env.local` в **корне** репозитория: `VITE_API_BASE_URL=https://домен/api` (без слэша в конце — нормализуется в коде).
- Если не задано, в браузере используется тот же origin + `/api` — удобно за reverse-proxy.
- Локальная отладка без прокси: fallback в коде на `http://localhost:8787/api`.

См. README в корне репозитория и [[REST слой висит на префиксе api]].
