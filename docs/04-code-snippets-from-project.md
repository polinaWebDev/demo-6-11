# Шпаргалка: сниппеты из проекта

Все фрагменты взяты из этого репозитория. Подробные объяснения — в `01-backend-prisma-actions.md` и `02-frontend-pages-components.md`.

Содержание: [Prisma](#prisma) · [lib](#lib) · [Сессия и защита](#сессия-и-защита) · [API-слой и actions](#api-слой-и-server-actions) · [Формы](#формы-useactionstate) · [Слайдер](#слайдер) · [Серверные страницы](#серверные-страницы) · [Админка](#админка) · [Команды](#команды)

---

## Prisma

### Схема: модель, связь, enum
```prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"   // клиент генерируется в проект
}

datasource db {
  provider = "postgresql"                // url берётся из prisma7.config.ts
}

model User {
  id           String        @id @default(uuid())
  login        String        @unique
  passwordHash String
  role         Role          @default(user)
  createdAt    DateTime      @default(now())
  application  Application[]            // обратная сторона связи
}

model Application {
  id     String  @id @default(uuid())
  userId String
  user   User    @relation(fields: [userId], references: [id])
  status Status  @default(new)
  review String?                         // ? = необязательное поле
}

enum Role   { admin user }
enum Status { new in_progress completed }
```

### Конфиг `prisma7.config.ts`
```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env["DATABASE_URL"] },
});
```

### Клиент `lib/prisma.ts` (синглтон + адаптер)
```ts
import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Сид админа (`upsert` — можно запускать повторно)
```ts
const passwordHash = await bcrypt.hash("KorokNET", 10);
await prisma.user.upsert({
  where: { login: "Admin" },
  update: {},
  create: { login: "Admin", passwordHash, fullName: "Администратор портала",
            phone: "8(000)000-00-00", email: "admin@korochki.est", role: "admin" },
});
```

### Запросы
Эти вызовы живут **только в `lib/api/*`** (API-слой); страницы и actions зовут сервисы.

```ts
// найти один по уникальному полю
const user = await prisma.user.findUnique({ where: { login } })

// создать
const user = await prisma.user.create({ data: { login, passwordHash, fullName, phone, email } })

// список со своим фильтром и сортировкой
const applications = await prisma.application.findMany({
  where: { userId: session.userId },
  orderBy: { createdAt: 'desc' },
})

// обновить
await prisma.application.update({ where: { id }, data: { status } })

// с подгрузкой связанной записи + пагинация
prisma.application.findMany({
  where, include: { user: true },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
})

// общее количество с тем же фильтром
prisma.application.count({ where })

// два запроса параллельно
const [applications, total] = await Promise.all([ /* findMany */, /* count */ ])
```

---

## lib

### Регулярки (`lib/validation.ts`)
```ts
export const LOGIN_RE = /^[A-Za-z0-9]{6,}$/                 // латиница+цифры, от 6
export const FULL_NAME_RE = /^[А-Яа-яЁё\s]+$/               // кириллица и пробелы
export const PHONE_RE = /^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/     // 8(XXX)XXX-XX-XX
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/        // ДД.ММ.ГГГГ (3 группы)
```

### Подписи для enum (`lib/labels.ts`)
```ts
export const COURSE_LABELS: Record<Course, string> = {
  algorithms: 'Основы алгоритмизации и программирования',
  webdesign: 'Основы веб-дизайна',
  databases: 'Основы проектирования баз данных',
}

// список допустимых значений выводится из словаря
export const VALID_COURSES = Object.keys(COURSE_LABELS) as Course[]

export const formatDate = (date: Date) => date.toLocaleDateString('ru-RU')
```

### Пароли (`lib/password.ts`)
```ts
import 'server-only'                      // нельзя импортировать в клиентский код
import bcrypt from 'bcrypt'

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

---

## Сессия и защита

### JWT в httpOnly-cookie (`lib/session.ts`)
```ts
const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET)

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(encodedKey)
}

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload)
  ;(await cookies()).set('session', token, {
    httpOnly: true,                                  // недоступна из JS
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600,
  })
}

export async function verifySession(token: string | null) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, encodedKey)
    if (!isRole(payload.role)) return null
    return { userId: payload.userId as string, role: payload.role }
  } catch {
    return null                                      // подпись неверна / токен истёк
  }
}

// cache — в рамках одного запроса токен проверяется один раз
export const getSession = cache(async () => {
  const token = (await cookies()).get('session')?.value || null
  return verifySession(token)
})

export async function deleteSession() {
  ;(await cookies()).delete('session')
}
```

### `proxy.ts` (в Next 16 вместо `middleware.ts`)
```ts
export async function proxy(request: NextRequest) {
  const token = request.cookies.get('session')?.value ?? null
  const session = await verifySession(token)
  if (!session || session.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
export const config = { matcher: ['/admin/:path*'] }   // только эти пути
```

### Layout группы `(protected)/layout.tsx`
```tsx
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  return children
}
```

### Проверка прав внутри страницы / action
```ts
const session = await getSession()
if (!session || session.role !== 'admin') redirect('/login')
```

---

## API-слой и server actions

Правило: `prisma` — только в `lib/api/*`; `FormData`, сессия, `redirect` и `revalidatePath` — только в actions. Сервис возвращает `{ ok: true | false, ... }`, action решает, что делать.

### Шаблон: чтение формы (action)
```ts
'use server'

const login = String(formData.get('login') ?? '')   // защита от null и File
```

### Каркас action
```ts
const session = await getSession()                          // кто пользователь
if (!session) redirect('/login')
const result = await someService(session.userId, {...})    // вся логика — в lib/api
if (!result.ok) return { fieldErrors: result.fieldErrors }  // ошибки обратно в форму
redirect('/applications')                                   // успех — всегда в конце, вне try/catch
```

### Результаты сервисов (`lib/api/auth.ts`)
```ts
export type RegisterResult =
  | { ok: true; user: AuthUser }
  | { ok: false; fieldErrors: Record<string, string> }

export type LoginResult = { ok: true; user: AuthUser } | { ok: false; error: string }
```

### Регистрация
Сервис (`lib/api/auth.ts`):
```ts
import 'server-only'

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const fieldErrors: Record<string, string> = {}
  if (!LOGIN_RE.test(input.login)) fieldErrors.login = 'Логин: латиница и цифры, от 6 символов'
  if (input.password.length < 8)   fieldErrors.password = 'Пароль не менее 8 символов'
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }

  const existing = await prisma.user.findUnique({ where: { login: input.login } })
  if (existing) return { ok: false, fieldErrors: { login: 'Логин занят' } }

  const passwordHash = await hashPassword(input.password)
  const user = await prisma.user.create({ data: { /* login, passwordHash, fullName, phone, email */ } })
  return { ok: true, user: { id: user.id, role: user.role } }
}
```
Action (`app/register/actions.ts`):
```ts
const result = await registerUser({ login: String(formData.get('login') ?? ''), /* … */ })
if (!result.ok) return { fieldErrors: result.fieldErrors }
await createSession({ userId: result.user.id, role: result.user.role })
redirect('/applications')
```

### Вход
Сервис:
```ts
export async function loginUser(login: string, password: string): Promise<LoginResult> {
  if (!login || !password) return { ok: false, error: 'Заполните все поля' }

  const user = await prisma.user.findUnique({ where: { login } })
  if (!user) return { ok: false, error: 'Пользователь не найден' }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) return { ok: false, error: 'Неверный логин или пароль' }

  return { ok: true, user: { id: user.id, role: user.role } }
}
```
Action:
```ts
const result = await loginUser(String(formData.get('login') ?? ''), String(formData.get('password') ?? ''))
if (!result.ok) return { formError: result.error }
await createSession({ userId: result.user.id, role: result.user.role })
redirect('/applications')
```

### Выход (сервиса нет)
```ts
export async function logout(): Promise<void> {
  await deleteSession()
  redirect('/login')
}
```

### Проверка значения из формы по списку (в сервисе)
```ts
const course = input.course as Course                   // as — только для TS
if (!VALID_COURSES.includes(course)) {                  // настоящая проверка
  fieldErrors.course = 'Выберите один из предложенных курсов'
}
```

### Дата `ДД.ММ.ГГГГ` → `Date` (в сервисе)
```ts
const dateMatch = DATE_RE.exec(input.startDate)
if (!dateMatch) fieldErrors.startDate = 'Дата должна быть в формате ДД.ММ.ГГГГ'
if (Object.keys(fieldErrors).length > 0 || !dateMatch) return { ok: false, fieldErrors }

const [, day, month, year] = dateMatch
// месяц с 0 (январь = 0), UTC — чтобы дата не «поплыла» из-за часового пояса
const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
```

### Создание заявки: action берёт userId из сессии
```ts
const session = await getSession()
if (!session) redirect('/login')

const result = await createApplicationRecord(session.userId, {      // lib/api/applications.ts
  course: String(formData.get('course') ?? ''),
  startDate: String(formData.get('startDate') ?? ''),
  payment: String(formData.get('payment') ?? ''),
})
if (!result.ok) return { fieldErrors: result.fieldErrors }
redirect('/applications')
```

### Отзыв: правила в сервисе, `revalidatePath` в action
Сервис (`lib/api/applications.ts`), `true` — сохранён:
```ts
export async function addReview(userId: string, applicationId: string, review: string): Promise<boolean> {
  const text = review.trim()
  if (!text) return false

  const application = await prisma.application.findUnique({ where: { id: applicationId } })
  if (!application || application.userId !== userId || application.status !== 'completed') {
    return false                                      // чужая заявка или обучение не завершено
  }

  await prisma.application.update({ where: { id: applicationId }, data: { review: text } })
  return true
}
```
Action (`app/(protected)/applications/actions.ts`):
```ts
export async function addReview(applicationId: string, formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session) return

  const saved = await saveReview(session.userId, applicationId, String(formData.get('review') ?? ''))
  if (saved) revalidatePath('/applications')          // обновить кеш страницы
}
```
(`import { addReview as saveReview } from '@/lib/api/applications'` — переименование, чтобы не совпадало с именем action.)

### Смена статуса: безопасный редирект
Сервис (`lib/api/admin.ts`) — `try/catch` живёт здесь, а не в action:
```ts
export async function updateApplicationStatus(applicationId: string, status: Status): Promise<boolean> {
  try {
    await prisma.application.update({ where: { id: applicationId }, data: { status } })
    return true
  } catch {
    return false                // заявки с таким id нет
  }
}
```
Action:
```ts
const redirectToRaw = String(formData.get('redirectTo') ?? '/admin')
const safeRedirectTo = redirectToRaw.startsWith('/admin') ? redirectToRaw : '/admin'  // не open redirect

if (!(statusRaw in STATUS_LABELS)) redirect(safeRedirectTo)

const updated = await updateApplicationStatus(applicationId, statusRaw as Status)
if (!updated) redirect(safeRedirectTo)

const separator = safeRedirectTo.includes('?') ? '&' : '?'
redirect(`${safeRedirectTo}${separator}updated=true`)
```

---

## Формы (`useActionState`)

### Страница
```tsx
'use client'
const initialState: LoginState = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState)
  return <LoginForm action={formAction} formError={state.formError} pending={pending} />
}
```

### Поле с подсказкой / ошибкой
```tsx
<Field>
  <FieldLabel htmlFor="login">Логин</FieldLabel>
  <Input id="login" name="login" type="text" required className="bg-background" />
  <FieldDescription className={fieldErrors?.login ? "text-destructive" : undefined}>
    {fieldErrors?.login ?? "Латинские буквы и цифры, не менее 6 символов."}
  </FieldDescription>
</Field>
```

### Кнопка отправки
```tsx
<Button type="submit" disabled={pending}>
  {pending ? "Входим..." : "Войти"}
</Button>
```

### Две колонки: форма + слайдер
```tsx
<div className="grid min-h-svh lg:grid-cols-2">
  <div className="flex items-center justify-center p-6 md:p-10"> {/* форма */} </div>
  <div className="relative hidden lg:block"> <ImageSlider/> </div>
</div>
```

### `Select` с русскими подписями
```tsx
<Select name="course">
  <SelectTrigger id="course" className="w-full">
    <SelectValue placeholder="Выберите...">
      {(value: string) => COURSE_LABELS[value as keyof typeof COURSE_LABELS]}
    </SelectValue>
  </SelectTrigger>
  <SelectContent>
    {Object.entries(COURSE_LABELS).map(([value, label]) => (
      <SelectItem key={value} value={value}>{label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Кнопка-ссылка (Base UI: `render`, не `asChild`)
```tsx
<Button render={<Link href="/applications/new" />} nativeButton={false}>
  Оформить заявку
</Button>
```

### Выход одной кнопкой
```tsx
<form action={logout}>
  <Button type="submit" variant="outline">Выйти</Button>
</form>
```

### Форма с id: `.bind` (одна форма на заявку)
```tsx
<form action={addReview.bind(null, application.id)}>   {/* ≈ (formData) => addReview(id, formData) */}
  <Textarea name="review" required />
  <Button type="submit">Отправить отзыв</Button>
</form>
```

---

## Слайдер

```tsx
const [index, setIndex] = useState(0)

const next = useCallback(() => setIndex(c => (c + 1) % SLIDES.length), [])
const prev = useCallback(() => setIndex(c => (c - 1 + SLIDES.length) % SLIDES.length), [])
//  % — остаток: после последнего слайда снова 0; + SLIDES.length — чтобы не получить -1

useEffect(() => {
  const id = setInterval(next, 3000)       // автопрокрутка
  return () => clearInterval(id)           // обязательно очищать
}, [next, index])                          // index: после клика отсчёт начинается заново
```

Слайды друг на друге, активный виден:
```tsx
<div className="relative h-full w-full overflow-hidden bg-muted">
  {SLIDES.map((slide, i) => (
    <Image
      key={slide.src} src={slide.src} alt={slide.alt} fill
      priority={i === 0} sizes="50vw"
      className={cn('object-cover transition-opacity duration-700',
                    i === index ? 'opacity-100' : 'opacity-0')}
    />
  ))}
</div>
```

Стрелка и точка:
```tsx
<button type="button" onClick={prev} aria-label="Предыдущий слайд"
  className="absolute top-1/2 left-4 -translate-y-1/2 …"><ChevronLeft/></button>

<button type="button" aria-label={`Перейти к слайду ${i + 1}`} onClick={() => setIndex(i)}
  className={cn('size-2 rounded-full', i === index ? 'bg-background' : 'bg-background/40')} />
```

---

## Серверные страницы

### Данные прямо в компоненте (через API-слой)
```tsx
export default async function ApplicationsPage() {
  const session = await getSession()
  if (!session) return null
  const applications = await listUserApplications(session.userId)
  // …
}
```

### Условный рендер: пусто / список / форма отзыва
```tsx
{applications.length === 0 ? (
  <p className="text-sm text-muted-foreground">У вас пока нет заявок</p>
) : (
  <ul>{applications.map((a) => <li key={a.id}>…</li>)}</ul>
)}

{application.review && <p>Ваш отзыв: {application.review}</p>}
{application.status === 'completed' && !application.review && <form …>…</form>}
{session.role === 'admin' && <Button …>Панель администратора</Button>}
```

---

## Админка

### `searchParams` (в Next 16 это Promise) + проверка значений
```tsx
interface AdminPageProps {
  searchParams: Promise<{ status?: string; course?: string; page?: string; updated?: string }>
}

const params = await searchParams
const status =
  params.status && params.status !== 'all' && params.status in STATUS_LABELS
    ? (params.status as Status)
    : undefined

const pageNum = Number(params.page)
const page = Number.isFinite(pageNum) && pageNum >= 1 ? Math.floor(pageNum) : 1

// запрос и пагинация — в lib/api/admin.ts; страница получает готовый результат
const { applications, totalPages } = await listApplications({ status, course, page })
```

### Фильтры — обычная GET-форма
```tsx
<form method="GET">
  <LabeledSelect name="status" defaultValue={status ?? 'all'} labels={STATUS_FILTER_LABELS} ariaLabel="Фильтр по статусу" />
  <Button type="submit" variant="secondary">Применить</Button>
</form>
```
```ts
const STATUS_FILTER_LABELS = { all: 'Все статусы', ...STATUS_LABELS }   // добавили пункт «все»
```

### Ссылка на страницу с сохранением фильтров
```ts
function buildUrl(targetPage: number): string {
  const query = new URLSearchParams()
  if (status) query.set('status', status)
  if (course) query.set('course', course)
  query.set('page', String(targetPage))
  return `/admin?${query.toString()}`
}
```

### Смена статуса в строке таблицы
```tsx
<form action={updateStatus}>
  <input type="hidden" name="applicationId" value={application.id} />
  <input type="hidden" name="redirectTo" value={currentUrl} />   {/* вернуться на ту же страницу */}
  <LabeledSelect name="status" defaultValue={application.status} labels={STATUS_LABELS} ariaLabel="Статус заявки" size="sm" />
  <Button type="submit" variant="secondary" size="sm">Сохранить</Button>
</form>
```

### Таблица, которая прокручивается на телефоне
```tsx
<div className="w-full max-w-4xl overflow-x-auto">
  <Table className="min-w-[640px]"> … </Table>
</div>
```

### Сообщение об успехе
```tsx
{params.updated === 'true' && (
  <div className="rounded-lg bg-emerald-100 px-4 py-3 text-sm text-emerald-800">Статус заявки обновлён</div>
)}
```

### Пагинация: кнопка-ссылка или отключённая
```tsx
{page <= 1 ? (
  <Button variant="secondary" disabled>Назад</Button>
) : (
  <Button variant="secondary" render={<Link href={buildUrl(page - 1)} />} nativeButton={false}>Назад</Button>
)}
<span>Страница {page} из {totalPages}</span>
```

---

## Команды

```bash
# окружение
cp .env.example .env
npm install

# Prisma (всегда с --config, т.к. файл называется prisma7.config.ts)
npx prisma migrate dev --config prisma7.config.ts --name init   # миграция + таблицы
npx prisma generate     --config prisma7.config.ts              # клиент (после любых правок схемы)
npx prisma db seed      --config prisma7.config.ts              # админ Admin / KorokNET
npx prisma migrate status --config prisma7.config.ts            # состояние миграций

# проект
npm run dev             # http://localhost:3000
npx tsc --noEmit        # проверка типов
npm run lint

# shadcn-компоненты
npx shadcn@latest add button input field select card table textarea label
```

`.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/korochki_est_next?schema=public"
SESSION_SECRET="длинная-случайная-строка-не-короче-32-символов"
```

## Мини-чеклист перед сдачей

- [ ] `npx tsc --noEmit` и `npm run lint` без ошибок
- [ ] Регистрация → вход → заявка → отзыв после статуса «завершено»
- [ ] Админ: фильтры, смена статуса, пагинация, сообщение об успехе
- [ ] Обычный пользователь не попадает на `/admin`
- [ ] Слайдер: автопрокрутка, стрелки, точки
- [ ] Телефон/планшет: ничего не вылезает за экран
