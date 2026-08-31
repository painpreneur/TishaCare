# Контуры (environments)

Три уровня изоляции. Главный принцип: **прод-секреты живут только в Vercel
Production. Их не должно быть ни на одной машине разработчика, ни в одном
локальном `.env`.**

## Текущий статус

- **production** — поднят: Vercel Production деплоит с ветки `main`, бот работает
  вебхуком, миграции накатываются в `vercel-build`.
- **local** — по этому документу, изолированная БД на каждую рабочую ветку
  (`createdb tishacare_<feature>`), токен `@…_dev_bot`.
- **staging** — ещё не стоит отдельным контуром. Чтобы поднять: ветка Neon
  `staging`, бот `@…_staging_bot`, переменные в Vercel **Preview** и
  постоянный алиас (раздел «Как поднять контур» → staging). До этого приёмку
  (`SMOKE.md`) прогоняют на локальном контуре с dev-ботом.

| | production | staging | local |
|---|---|---|---|
| Хостинг веб-панели | Vercel Production (ветка `main`) | Vercel Preview, постоянный алиас | `next dev` + туннель |
| Бот | webhook внутри `apps/web` | webhook внутри `apps/web` (Preview) | `apps/bot` long-polling |
| Telegram-бот | боевой `@…bot` | `@…_staging_bot` | `@…_dev_bot` |
| Postgres | ветка Neon `main` (или отд. проект) | ветка Neon `staging` | локальный PG / личная ветка Neon |
| `DATABASE_URL` | пуленая строка (`-pooler`) | пуленая строка (`-pooler`) | локальный PG |
| `DIRECT_URL` | прямая строка Neon (без `-pooler`), в Vercel env | только для ручного `migrate deploy`, не в Vercel | = `DATABASE_URL` |
| `APP_ENV` | `production` | `staging` | `local` |
| `MINIAPP_DEV_BYPASS` | **запрещён** (падаем при старте) | разрешён | разрешён |
| Напоминания | Vercel Cron | Vercel Cron | выкл.; `ENABLE_LOCAL_REMINDERS=1` для теста |
| Схема БД | `migrate deploy` авто в `vercel-build` | `migrate deploy` вручную (staging creds) | `migrate dev` / `db push` |

Миграции БД — см. [DATABASE.md](DATABASE.md).

## `APP_ENV`

Единый признак контура, читается в `packages/db/env.ts` (`APP_ENV`,
`isProduction`, `isStaging`, `isLocal`). Если переменная не задана, на
деплоях Vercel выводится из `VERCEL_ENV` (`production` → `production`,
`preview` → `staging`), иначе — `local`.

Что от него зависит:

- `apps/web/lib/telegramAuth.ts` — при `production` + `MINIAPP_DEV_BYPASS=1`
  приложение падает при загрузке модуля (fail closed), и сам обход в любом
  случае игнорируется.
- `apps/bot/index.ts` — отказывается стартовать при `APP_ENV=production`
  (локальный polling вызвал бы `deleteWebhook` и перехватил боевой трафик).

## Почему бот разделён

`apps/web` (webhook) обслуживает продакшен. `apps/bot` (polling) — только
локальный dev-цикл, не деплоится. Telegram отдаёт каждый апдейт один раз:
запущенный локально polling с боевым токеном увёл бы сообщения пациентов
на ноутбук. Разные токены на контур убирают этот класс ошибок.

Вся логика бота живёт в общем пакете `@tishacare/bot-core` (`createBot`,
обработчики чек-ина, напоминаний, меню). `apps/web/lib/bot.ts` и
`apps/bot/index.ts` только вызывают `createBot()` и различаются транспортом:
webhook против long-polling, плюс планировщик напоминаний в `apps/bot`.
Правка логики — в одном месте.

## Как поднять контур

### local
1. `APP_ENV=local` во всех `.env` (`apps/web/.env.local`, `apps/bot/.env`, `packages/db/.env`).
2. `DATABASE_URL` — локальный PG (`createdb tishacare`) или личная ветка Neon. **Не боевой.**
3. `TELEGRAM_BOT_TOKEN` — токен `@…_dev_bot`.
4. `npm run db:migrate:deploy && npm run db:seed`, затем `npm run web` и/или `npm run bot`.
5. Для webhook-режима / Mini App на телефоне — туннель (cloudflared/ngrok), его адрес в `WEBAPP_URL`.

### staging
1. Ветка Neon `staging` от `main`.
2. Отдельный бот `@…_staging_bot`.
3. Vercel: переменные в окружении **Preview** (`APP_ENV=staging`, `DATABASE_URL` = пуленая строка ветки `staging`, токен, `WEBAPP_URL` = алиас Preview, свои секреты).
4. `setWebhook` на `<staging-alias>/api/bot/webhook` с `secret_token` = `TELEGRAM_WEBHOOK_SECRET`.

Миграции staging накатываются вручную (`prisma migrate deploy` со staging-строкой и её прямым, не-пуленым `DIRECT_URL`) — Preview-деплой их не трогает, чтобы открытые PR не гоняли миграции по общей ветке.

### production
1. Ветка Neon `main` / отдельный проект. Строка — **только** в Vercel Production env.
2. Боевой бот.
3. Vercel: переменные в окружении **Production** (`APP_ENV=production`, `DATABASE_URL` пуленая, `DIRECT_URL` прямая, `MINIAPP_DEV_BYPASS` не задан).
4. `setWebhook` на боевой домен с `secret_token`.

`vercel-build` применяет `prisma migrate deploy` к ветке Neon `main` на каждом Production-деплое (`VERCEL_ENV=production`); при отсутствии `DIRECT_URL` сборка падает намеренно. Первый деплой после долгого дрейфа лучше сделать вручную (см. [DATABASE.md](DATABASE.md)) со снапшотом БД.

## Чеклист выноса прод-доступа с локальной машины

- [ ] `apps/web/.env.local` — `DATABASE_URL` / `DIRECT_URL` не боевые, `APP_ENV=local`
- [ ] `apps/bot/.env` — `DATABASE_URL` не боевой, токен dev-бота, `APP_ENV=local`
- [ ] `packages/db/.env` — `DATABASE_URL` / `DIRECT_URL` не боевые
- [ ] боевые `DATABASE_URL` / `DIRECT_URL` / `*_SECRET` — только в Vercel Production
- [ ] исторически утёкшие токены отозваны и перевыпущены (см. README)
