# Часть 1. Бэкенд: Prisma, lib/ и server actions

Порядок такой, в каком я бы делала это на экзамене: сначала данные, потом «кирпичики» в `lib/`, потом защита маршрутов, потом **API-слой** (`lib/api/`), и только потом тонкие actions. UI (страницы) идёт в следующих частях.

Стек: Next.js 16 (App Router), Prisma 7 + PostgreSQL, bcrypt, jose (JWT в cookie).

---

## Архитектура: три слоя

```
UI: page.tsx, components/*          рисует страницу; форму отдаёт в action,
   │                                 данные читает через lib/api
   ▼
Server actions: app/**/actions.ts   «контроллер»: FormData → аргументы, сессия,
   │                                 redirect, revalidatePath
   ▼
API-слой: lib/api/*.ts              правила и валидация, всё общение с Prisma
   │
   ▼
lib/prisma.ts → PostgreSQL
```

Правила слоя:
- **Только `lib/api/*` импортирует `prisma`.** В actions и страницах `@/lib/prisma` больше нет.
- Функции API-слоя ничего не знают про HTTP: нет `FormData`, `cookies()`, `redirect()`, `revalidatePath()`. Они принимают обычные значения и возвращают результат.
- Ошибки валидации возвращаются **значением**, а не исключением: `{ ok: false, fieldErrors }` / `{ ok: false, error }` / `{ ok: true, ... }`. Action решает, что с этим делать (показать ошибку или сделать редирект).
- Кто пользователь — решает action (берёт `userId` из сессии) и **передаёт его** в сервис. Из формы `userId` никогда не берётся.
- Первая строка каждого файла — `import 'server-only'`: клиентский компонент не сможет случайно подключить код с базой.

| Файл | Функции |
|---|---|
| `lib/api/auth.ts` | `registerUser(input)`, `loginUser(login, password)` |
| `lib/api/applications.ts` | `listUserApplications(userId)`, `createApplication(userId, input)`, `addReview(userId, applicationId, review)` |
| `lib/api/admin.ts` | `listApplications({ status, course, page })`, `updateApplicationStatus(id, status)`, константа `PAGE_SIZE` |

Зачем разделять: правила (проверки, «отзыв только на свою завершённую заявку») лежат в одном месте и не размазаны по страницам и формам; actions получаются короткими; сервисы можно проверять отдельно, без форм и браузера.

---

## Шаг 0. Окружение

1. `.env` (шаблон — `.env.example`):
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/korochki_est_next?schema=public"
   SESSION_SECRET="длинная-случайная-строка-не-короче-32-символов"
   ```
2. Нужен запущенный PostgreSQL (локально или в Docker).
3. `npm install`.

Почему это первым: без `DATABASE_URL` не работает ничего, а без `SESSION_SECRET` не подпишется сессия.

---

## Шаг 1. Схема данных — `prisma/schema.prisma`

Сначала читаем ТЗ и выписываем сущности и поля. Здесь их две: **User** и **Application** (заявка на курс).

```prisma
model User {
  id           String        @id @default(uuid())
  login        String        @unique        // уникальность логина — на уровне БД
  passwordHash String                       // хранится хеш, не пароль
  fullName     String
  phone        String
  email        String
  role         Role          @default(user) // по умолчанию обычный пользователь
  createdAt    DateTime      @default(now())
  application  Application[]               // обратная сторона связи
}

model Application {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  course    Course
  startDate DateTime
  payment   Payment
  status    Status   @default(new)          // новая заявка всегда «Новая»
  review    String?                         // отзыв необязателен (?)
  createdAt DateTime @default(now())
}
```

Три enum'а-справочника вместо строк: `Role`, `Course`, `Payment`, `Status`. Плюс: БД сама не даст записать значение, которого нет в списке.

**Что говорить, если спросят:**
- `@id @default(uuid())` — первичный ключ, генерируется автоматически.
- `@unique` на `login` — вторая линия защиты от дублей (первая — проверка в action).
- `String?` — поле может быть `null` (отзыв появляется позже).
- `@relation(fields: [userId], references: [id])` — внешний ключ: заявка принадлежит пользователю. Связь 1 → много.

Особенность Prisma 7 в этом проекте: клиент генерируется **в код проекта** (`output = "../app/generated/prisma"`), а в `datasource` нет `url` — адрес БД берётся из конфига (шаг 2).

---

## Шаг 2. Конфиг, миграция, сид

**`prisma7.config.ts`** — говорит Prisma, где схема, где миграции, чем запускать сид и какой `DATABASE_URL` использовать. Файл называется нестандартно (по умолчанию `prisma.config.ts`), поэтому во все команды добавляем `--config prisma7.config.ts`.

Команды:
```bash
npx prisma migrate dev --config prisma7.config.ts --name init   # создать таблицы + миграцию
npx prisma generate --config prisma7.config.ts                  # сгенерировать клиент
npx prisma db seed --config prisma7.config.ts                   # создать админа
```

**`prisma/seed.ts`** — создаёт администратора `Admin / KorokNET` (так требует ТЗ: админ не регистрируется через форму). Используется `upsert`: если админ уже есть, ничего не меняется, поэтому сид можно запускать повторно.

> **Исправленная опечатка в миграциях.** В `20260911132938_done` enum `Course` был создан со значением `'alorithms'`, а в `schema.prisma` — `algorithms`. На чистой БД создание заявки с курсом `algorithms` падало бы.
> Старые миграции не редактируем (они уже могли быть применены), поэтому добавлена новая — `20261010120000_fix_course_algorithms_typo`:
> ```sql
> ALTER TYPE "Course" RENAME VALUE 'alorithms' TO 'algorithms';
> ```
> `RENAME VALUE` сам обновляет уже существующие строки. Проверено на чистом Postgres 16: все три миграции применяются, `enum_range` даёт `{algorithms,webdesign,databases}`, `prisma migrate diff` между БД и схемой — «No difference detected».
>
> Урок для экзамена: после `migrate dev` всегда смотрите, что в `migration.sql` значения enum совпадают со схемой; если ошиблись, не правьте применённую миграцию, а создайте новую.

---

## Шаг 3. Клиент БД — `lib/prisma.ts`

```ts
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- В Prisma 7 клиенту нужен **адаптер** (`@prisma/adapter-pg`) для подключения к Postgres.
- Синглтон через `globalThis`: в dev-режиме Next перезагружает модули при каждом сохранении, и без этого плодились бы подключения к БД.
- Везде дальше: `import { prisma } from '@/lib/prisma'`.

---

## Шаг 4. Вспомогательные модули `lib/`

### `lib/validation.ts` — регулярки из ТЗ
| Константа | Что проверяет |
|---|---|
| `LOGIN_RE` | латиница и цифры, от 6 символов |
| `FULL_NAME_RE` | кириллица и пробелы |
| `PHONE_RE` | формат `8(XXX)XXX-XX-XX` |
| `EMAIL_RE` | простой шаблон `a@b.c` |
| `DATE_RE` | `ДД.ММ.ГГГГ`, с захватом дня/месяца/года |

Вынесены в отдельный файл, чтобы одни и те же правила использовались и в actions, и (при желании) в форме.

### `lib/labels.ts` — человекочитаемые подписи
Значения enum в БД — латиница (`in_progress`), а пользователю нужно «Идет обучение». Словари `COURSE_LABELS`, `PAYMENT_LABELS`, `STATUS_LABELS` типизированы как `Record<Course, string>` и т.д. — TypeScript заставит добавить подпись, если появится новое значение enum.

`VALID_COURSES` / `VALID_PAYMENTS` — это `Object.keys(...)` тех же словарей: список допустимых значений для проверки ввода выводится из одного источника, и рассинхрона не будет.

`formatDate` — вывод даты в ru-RU формате.

### `lib/password.ts` — bcrypt
`hashPassword` и `verifyPassword`. `import 'server-only'` в начале гарантирует, что файл нельзя случайно подключить в клиентский компонент.

### `lib/session.ts` — сессия в JWT-cookie
Как это работает:
1. `signSession` — подписывает JWT (алгоритм HS256, ключ из `SESSION_SECRET`, срок жизни 1 час). В токене лежит `userId` и `role`.
2. `createSession` — кладёт токен в cookie `session` с флагами `httpOnly` (недоступна из JS в браузере), `secure` (только в production), `maxAge: 3600`.
3. `verifySession(token)` — проверяет подпись и срок; при любой ошибке возвращает `null`. Дополнительно проверяет, что `role` — известное значение (`isRole`).
4. `getSession` — читает cookie и вызывает `verifySession`. Обёрнута в `cache` из React: в рамках одного запроса токен проверится один раз, сколько бы раз её ни вызвали.
5. `deleteSession` — удаляет cookie (выход).

Тип `Role` (enum из Prisma) импортируется из `@/app/generated/prisma/enums` и используется в `isRole` и `SessionPayload`. Без этого импорта `npx tsc --noEmit` падает с `Cannot find name 'Role'`.

---

## Шаг 5. Защита маршрутов — `proxy.ts`

В Next.js 16 файл `middleware.ts` переименован в **`proxy.ts`**, а экспортируемая функция называется `proxy`.

```ts
export async function proxy(request: NextRequest) {
  const session = await verifySession(request.cookies.get('session')?.value ?? null)
  if (!session || session.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
export const config = { matcher: ['/admin/:path*'] }
```

- `matcher` ограничивает действие только путями `/admin/...`.
- Не админ (или нет сессии) → редирект на `/login`.
- Здесь нельзя использовать `getSession` (она берёт `cookies()` из `next/headers`), поэтому токен читается из `request.cookies` и отдаётся в `verifySession` — именно поэтому `verifySession` принимает токен параметром.

Обычных пользователей защищает layout-группа `(protected)` (это в следующей части про страницы). А **в каждом action мы проверяем права заново** — см. ниже. Прокси защищает страницу, но не action.

---

## Шаг 6. API-слой `lib/api/`

Пишем до actions: сначала правила, потом тонкая обвязка. Каждый файл начинается с `import 'server-only'`.

### 6.1 `lib/api/auth.ts`

Типы результатов:
```ts
export interface AuthUser { id: string; role: Role }

export type RegisterResult =
  | { ok: true; user: AuthUser }
  | { ok: false; fieldErrors: Record<string, string> }

export type LoginResult = { ok: true; user: AuthUser } | { ok: false; error: string }
```

**`registerUser(input)`**:
1. Проверить каждое поле регуляркой/длиной, собрать `fieldErrors` (пароль — минимум 8 символов).
2. Есть ошибки → `return { ok: false, fieldErrors }` (БД ещё не трогали).
3. `findUnique({ where: { login } })` — логин занят → ошибка на поле `login`.
4. `hashPassword` → `prisma.user.create` (роль не передаём, сработает `@default(user)`).
5. `return { ok: true, user: { id, role } }`.

Почему так: сначала дешёвые проверки, потом запрос в БД; ошибки привязаны к полям, чтобы показать их рядом с инпутами.

**`loginUser(login, password)`**: пустые поля → «Заполните все поля»; нет пользователя → «Пользователь не найден»; `verifyPassword` не прошёл → «Неверный логин или пароль»; иначе `{ ok: true, user }`.

(Замечание: «Пользователь не найден» подсказывает, какие логины существуют. Если в ТЗ нет требования различать ошибки, безопаснее одно общее сообщение «Неверный логин или пароль».)

### 6.2 `lib/api/applications.ts`

- **`listUserApplications(userId)`** — `findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })`. Фильтр по `userId` обязателен: пользователь видит только свои заявки.
- **`createApplication(userId, { course, startDate, payment })`**:
  1. `course` и `payment` проверяются по спискам `VALID_*` (значения из формы нельзя доверять: `as Course` — только подсказка для TypeScript, а не проверка).
  2. Дата приходит строкой `ДД.ММ.ГГГГ`: `DATE_RE.exec` вытаскивает день/месяц/год.
  3. `new Date(Date.UTC(year, month - 1, day))` — месяц в JS считается с нуля, а UTC нужен, чтобы дата не «поплыла» из-за часового пояса.
  4. `prisma.application.create` (статус по умолчанию `new`) → `{ ok: true }`; при ошибках → `{ ok: false, fieldErrors }`.
- **`addReview(userId, applicationId, review)`** → `Promise<boolean>`, `true` если отзыв сохранён. Цепочка проверок, любая неудача → `false`:
  - отзыв не пустой (после `trim`);
  - заявка существует, **принадлежит этому пользователю** (`application.userId !== userId`) и **имеет статус `completed`** (отзыв — только после завершения обучения).

### 6.3 `lib/api/admin.ts`

- **`listApplications({ status, course, page })`** — `where` собирается из переданных фильтров, `findMany` с `include: { user: true }`, `skip`/`take` и `count` с тем же `where` (через `Promise.all`). Возвращает `{ applications, total, totalPages }`. `PAGE_SIZE = 10` живёт здесь, а не на странице.
- **`updateApplicationStatus(id, status)`** — `update` в `try/catch` (заявки с таким `id` может не быть); `false`, если не получилось.

---

## Шаг 7. Server actions — тонкая обвязка

Action делает только то, что относится к веб-запросу. Общие правила:
- Первая строка `'use server'` — функции выполняются только на сервере и вызываются из форм.
- Данные приходят как `FormData`; всё читаем как `String(formData.get('x') ?? '')`, потому что значение может быть `null` или `File`.
- Для форм с `useActionState` (`login`, `register`, `createApplication`) сигнатура `(prevState, formData)`, а возвращается объект с ошибками, который форма покажет пользователю.
- `redirect()` вызывается **в конце** и не возвращает управление (внутри он бросает специальное исключение). Поэтому его нельзя оборачивать в `try/catch` — иначе перехватим сам редирект. Из-за этого `try/catch` вокруг БД живёт в API-слое (`updateApplicationStatus`), а не в action.

Каркас любого action:
```ts
const session = await getSession()                       // 1. кто пользователь
if (!session) redirect('/login')
const result = await someService(session.userId, {...}) // 2. вся логика — в lib/api
if (!result.ok) return { fieldErrors: result.fieldErrors } // 3. ошибки — обратно в форму
redirect('/applications')                                // 4. успех — редирект / revalidatePath
```

### 7.1 `app/register/actions.ts`
```ts
const result = await registerUser({ login: String(formData.get('login') ?? ''), /* … */ })
if (!result.ok) return { fieldErrors: result.fieldErrors }
await createSession({ userId: result.user.id, role: result.user.role })
redirect('/applications')
```

### 7.2 `app/login/actions.ts`
```ts
const result = await loginUser(String(formData.get('login') ?? ''), String(formData.get('password') ?? ''))
if (!result.ok) return { formError: result.error }
await createSession({ userId: result.user.id, role: result.user.role })
redirect('/applications')
```

### 7.3 `app/logout/actions.ts`
`deleteSession()` + `redirect('/login')`. Три строки; сервиса здесь нет, базы нет.

### 7.4 `app/(protected)/applications/new/actions.ts`
Сессия (нет → `redirect('/login')`), `createApplication(session.userId, { course, startDate, payment })`, ошибки → в форму, успех → `redirect('/applications')`. **`userId` берётся из сессии, а не из формы** — иначе можно подменить чужого пользователя.

### 7.5 `app/(protected)/applications/actions.ts`
`addReview(applicationId, formData)` — `applicationId` привязывается к форме через `.bind` (см. часть про страницы). Сессия → `saveReview(session.userId, applicationId, review)` → если вернулось `true`, `revalidatePath('/applications')` (сбросить кеш страницы, чтобы отзыв сразу появился). Имя сервиса при импорте переименовано (`addReview as saveReview`), чтобы не совпадать с именем action.

### 7.6 `app/(protected)/admin/actions.ts`
1. Нет сессии или роль не `admin` → `redirect('/login')`. (Дублирует `proxy.ts` намеренно: actions можно вызвать напрямую, минуя страницу. Права проверяет action, а не сервис.)
2. `redirectTo` приходит из формы, поэтому его **валидируем**: принимаем только пути, начинающиеся с `/admin`, иначе `/admin` (защита от open redirect).
3. `statusRaw in STATUS_LABELS` — статус должен быть одним из трёх допустимых.
4. `updateApplicationStatus(...)`; `false` → `redirect(safeRedirectTo)`.
5. К адресу добавляется `?updated=true` (или `&updated=true`, если query уже есть) — по нему страница покажет сообщение об успехе.

---

## Шпаргалка: порядок действий на экзамене (бэкенд)

1. `.env` → поднять БД → `npm install`.
2. `schema.prisma` → `migrate dev` → `generate`.
3. `lib/prisma.ts`, `lib/validation.ts`, `lib/labels.ts`, `lib/password.ts`, `lib/session.ts`.
4. `seed.ts` → `db seed` (админ).
5. `proxy.ts` (защита `/admin`).
6. API-слой: `lib/api/auth.ts` → `applications.ts` → `admin.ts`.
7. Тонкие actions: register → login → logout → createApplication → addReview → updateStatus.
8. `npx tsc --noEmit` и `npm run lint` перед сдачей.

## Частые ошибки

- `redirect()` внутри `try/catch`.
- Доверять `userId`/`role` из формы вместо сессии.
- Не проверять права внутри action, надеясь на `proxy`.
- Тащить `prisma`, `FormData` или `redirect()` не в тот слой: `prisma` — только в `lib/api`, `FormData`/`redirect` — только в actions.
- Бросать исключения для ошибок валидации вместо возврата `{ ok: false, ... }`.
- Забыть `npx prisma generate` после изменения схемы → типы не обновляются.
- Месяц в `new Date(y, m, d)` считается с 0.
- Опечатки в значениях enum между схемой и миграциями (разобрано в шаге 2).
