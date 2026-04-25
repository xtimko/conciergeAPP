---
title: Пустой рабочий каталог и цепочка &&
tags:
  - debugging
  - git
date: 2026-04-06
---

# Ничего не закоммитилось — push не выполнился

Команда `git add -A && git commit -m "..." && git push` при чистом дереве завершает `commit` с ошибкой → `push` не запускается из-за `&&`.

Чтобы выкатить без файловых изменений: `git commit --allow-empty -m "chore: redeploy"` или ручной **Run workflow** в Actions.
