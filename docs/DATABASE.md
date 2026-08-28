# Миграции БД (Prisma Migrate)

Схема БД меняется **только через версионированные миграции** в
`packages/db/prisma/migrations/`. `prisma db push` допустим лишь против
локальной БД для быстрых черновых итераций — его результат не
фиксируется и не воспроизводится на других контурах.

## Baseline

`0_init` — снимок всей текущей схемы на момент перехода на Migrate
(TishaCare, Aug 2026). Сгенерирован из `schema.prisma`:

```
prisma migrate diff --from-empty --to-schema-datamodel \
  packages/db/prisma/schema.prisma --script
```

Базы, которые уже существовали до перехода (локальная, прод, staging),
**не должны** применять `0_init` заново — таблицы там уже есть. Его нужно
один раз пометить как применённый:

```
npm exec -w @tishacare/db -- prisma migrate resolve --applied 0_init
```

(запускать с `DATABASE_URL` нужного контура; на локальной БД уже сделано).
Свежесозданная БД, наоборот, получает `0_init` обычным `deploy`.

## Рабочий цикл

### Локально — изменить схему

1. Правишь `packages/db/prisma/schema.prisma`.
2. `npm run db:migrate` (`prisma migrate dev`) — создаёт файл миграции,
   применяет его к локальной БД, регенерирует Prisma Client. На запрос
   имени — короткое описание (`add_patient_consent`).
3. Коммитишь `schema.prisma` **и** новую папку в `migrations/` одним PR.

### Прод / staging — применить

`prisma migrate deploy` — применяет только невыполненные миграции по
порядку, ничего не генерирует и не удаляет.

**Автоматически на каждом деплое Vercel** (E1.2): скрипт `vercel-build` в
`apps/web/package.json` запускает `prisma migrate deploy` перед `next build`.
Production-деплой мигрирует ветку Neon `main`, Preview-деплой — ветку
`staging` (у каждого окружения Vercel свои `DATABASE_URL` / `DIRECT_URL`).
Если миграция падает — падает и сборка, старый деплой остаётся живым.

`DIRECT_URL` — прямое (не пуленое) подключение к тому же Postgres. Миграции
берут session-lock, которого нет в транзакционном пулере Neon (`-pooler` в
хосте). Задать в Vercel в Production и Preview; локально/CI = `DATABASE_URL`.

Вручную (разовый backfill, догнать отставшую БД, откат) — та же команда:

```
npm run db:migrate:deploy      # с DATABASE_URL / DIRECT_URL нужного контура
```

### Проверить состояние

```
npm run db:migrate:status      # что применено, что ждёт
```

## Правила

- Никакого `db push` против прод/staging.
- Одна логическая правка схемы = одна миграция = один PR.
- Миграцию после мёрджа не редактируют — исправление идёт новой миграцией.
- Деструктивные шаги (drop колонки/таблицы, смена типа) — отдельным PR,
  с ручной проверкой на staging и планом отката.

См. [ENVIRONMENTS.md](ENVIRONMENTS.md) — какой контур на какой БД.
