# Шпаргалка: мои сниппеты VS Code

Сниппеты лежат в `~/Library/Application Support/Code/User/snippets/`:

| Файл | Что внутри |
|---|---|
| `consoleLog.code-snippets` | `c`, `fn`, `afn`, `asfn` |
| `react.code-snippets` | компоненты, хуки, JSX-вставки |
| `prisma.code-snippets` | схема Prisma: модели, поля, связи, enum, индексы |
| `c.json` | пустой шаблон (сниппетов нет) |

**Как пользоваться:** набрать префикс → выбрать из подсказки (`Tab` или `Enter`) → `Tab` перескакивает между местами для ввода (`$1`, `$2`…), `$0` — где окажется курсор в конце. Места с одним номером (например, `$1` в двух местах) заполняются одновременно. Если в `${1|A,B,C|}` есть список — откроется выпадающий выбор.

Скоуп — язык файла: `prisma` работает только в `.prisma`, `typescriptreact` — в `.tsx`, и т. д. Если сниппет не появляется, проверьте язык в правом нижнем углу окна VS Code.

---

## JS / TS (`consoleLog.code-snippets`)
Работают в `.js`, `.ts`, `.jsx`, `.tsx`.

| Префикс | Что вставляет |
|---|---|
| `c` | `console.log({})`: курсор внутри скобок, удобно для логирования `{ переменная }` |
| `fn` | обычная функция |
| `afn` | стрелочная функция в `const` |
| `asfn` | `async function` |

```ts
// c
console.log({value})

// fn
function name() {

}

// afn
const name = () => {

}

// asfn
async function name() {

}
```

---

## React / Next (`react.code-snippets`)

### Компоненты и страницы
| Префикс | Скоуп | Что вставляет |
|---|---|---|
| `rfc` | tsx, jsx | функциональный компонент (имя = имя файла) |
| `rfcp` | tsx | компонент с типизированными пропсами (`interface …Props`) |
| `rcc` | tsx, jsx | клиентский компонент с `'use client'` |
| `rpage` | tsx | серверная страница: `export default async function` |
| `ctx` | tsx | контекст + Provider + хук (`'use client'`) |

```tsx
// rfc  (имя берётся из имени файла, TM_FILENAME_BASE)
export function ImageSlider() {
	return (
		<div></div>
	)
}

// rfcp
interface LoginFormProps {

}

export function LoginForm({  }: LoginFormProps) {
	return (
		<div></div>
	)
}

// rcc
'use client'

export function ImageSlider() {
	return (
		<div></div>
	)
}

// rpage
export default async function Page() {
	return (
		<main></main>
	)
}
```

`ctx` создаёт сразу три вещи: `NameContext`, `NameProvider` и хук `useName`, который бросает ошибку, если вызван вне провайдера:
```tsx
'use client'

import { createContext, useContext, type ReactNode } from 'react'

interface NameContextValue {

}

const NameContext = createContext<NameContextValue | null>(null)

export function NameProvider({ children }: { children: ReactNode }) {
	const value: NameContextValue = {}

	return <NameContext.Provider value={value}>{children}</NameContext.Provider>
}

export function useName() {
	const ctx = useContext(NameContext)
	if (!ctx) throw new Error('useName must be used within NameProvider')
	return ctx
}
```

### Хуки
Работают в `.ts`, `.tsx`, `.js`, `.jsx`.

| Префикс | Что вставляет |
|---|---|
| `us` | `useState` с типом: `const [value, setValue] = useState<string>()` |
| `ue` | `useEffect(() => {…}, [])` |
| `uec` | `useEffect` с функцией очистки (`return () => {…}`) |
| `ucb` | `useCallback` |
| `um` | `useMemo` |
| `ur` | `useRef` |
| `uctx` | `useContext` |
| `hook` | своя функция-хук `use…` |

```tsx
// us
const [value, setValue] = useState<string>()

// ue
useEffect(() => {

}, [])

// uec  (для таймеров, подписок: очистка обязательна)
useEffect(() => {

	return () => {

	}
}, [])

// ucb
const name = useCallback(() => {

}, [])

// um
const value = useMemo(() => , [])

// ur
const ref = useRef<HTMLDivElement>(null)

// uctx
const value = useContext(Context)

// hook
export function useName() {

	return {}
}
```

### Вставки в JSX
Работают в `.tsx`, `.jsx`.

| Префикс | Что вставляет |
|---|---|
| `cl` | `className=""` |
| `onc` | `onClick={() => }` |
| `mapj` | рендер списка через `map` (⚠️ префикс именно `mapj`, а не `map`) |
| `cond` | условный рендер `{condition && ()}` |
| `tern` | тернарный рендер `{cond ? (…) : (…)}` |

```tsx
// mapj
{items.map((item) => (
	<div key={item.id}></div>
))}

// cond
{condition && ()}

// tern
{condition ? (

) : (

)}
```

---

## Prisma (`prisma.code-snippets`)
Работают только в `.prisma`-файлах.

### Заготовки
| Префикс | Что вставляет |
|---|---|
| `pgen` | `generator client` + `datasource db` (Prisma 7: без `url`, он в конфиге) |
| `pmodel` | модель с `id`, `createdAt`, `updatedAt` и `@@map` |
| `pmin` | минимальная модель (только `id`) |
| `penum` | `enum` |

```prisma
// pgen  (provider выбирается из списка: postgresql, mysql, sqlite…)
generator client {
	provider = "prisma-client"
	output   = "../src/generated/prisma"
}

datasource db {
	provider = "postgresql"
}

// pmodel
model Name {
	id        Int @id @default(autoincrement())

	createdAt DateTime @default(now()) @map("created_at")
	updatedAt DateTime @updatedAt @map("updated_at")

	@@map("table_name")
}

// pmin
model Name {
	id Int @id @default(autoincrement())

}

// penum
enum Role {
	USER
	ADMIN
}
```

### Поля
| Префикс | Что вставляет |
|---|---|
| `pid` | поле `id` (тип и `autoincrement()/uuid()/cuid()` — из списка) |
| `pts` | `createdAt` + `updatedAt` |
| `pf` | скалярное поле: тип из списка, затем `?`/`[]` |
| `pstr` | `String` с `@db.VarChar(255)` |
| `pjson` | `Json` с `@default("{}")` |
| `puniq` | уникальное поле `email String @unique` |

```prisma
// pid
id Int @id @default(autoincrement())

// pts
createdAt DateTime @default(now()) @map("created_at")
updatedAt DateTime @updatedAt @map("updated_at")

// pf  (тип: String, Int, BigInt, Boolean, DateTime, Float, Decimal, Json, Bytes)
name String 

// pstr
name String @db.VarChar(255)

// pjson
data Json @default("{}")

// puniq
email String @unique
```

### Связи
| Префикс | Что вставляет |
|---|---|
| `prel` | many-to-one: поле-связь + внешний ключ (`onDelete` из списка) |
| `prelm` | one-to-many: обратная сторона (`posts Post[]`) |
| `pone` | one-to-one: обе стороны, FK с `@unique` |
| `pmn` | явная join-таблица many-to-many |

```prisma
// prel  (в той модели, где лежит внешний ключ)
author   User @relation(fields: [authorId], references: [id], onDelete: Cascade)
authorId Int

// prelm  (в модели «один», обратная сторона)
posts Post[]

// pone
profile   Profile?

// в зависимой модели:
user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
userId Int  @unique

// pmn
model AOnB {
	a   A @relation(fields: [aId], references: [id], onDelete: Cascade)
	aId Int @map("a_id")
	b   B @relation(fields: [bId], references: [id], onDelete: Cascade)
	bId Int @map("b_id")

	@@id([aId, bId])
	@@index([bId])
	@@map("a_on_b")
}
```

### Атрибуты уровня модели
| Префикс | Что вставляет |
|---|---|
| `pidx` | `@@index([field])` |
| `puq` | `@@unique([a, b])` — составная уникальность |
| `pcid` | `@@id([a, b])` — составной первичный ключ |
| `pmap` | `@@map("table_name")` |

---

## Где сниппеты не совпадают с этим проектом

Сниппеты универсальные, а в проекте (демо-экзамен) некоторые вещи другие. Вставили сниппет → поправьте:

| Сниппет | Что вставляет по умолчанию | В проекте |
|---|---|---|
| `pgen` | `output = "../src/generated/prisma"` | `"../app/generated/prisma"` (папки `src` нет) |
| `pid` / `pmodel` | `Int` + `autoincrement()` | `String` + `uuid()` (в списке выбирается вручную) |
| `penum` | значения `USER`, `ADMIN` (заглавные) | `admin`, `user`, `new`, `in_progress`… (строчные) |
| `pmodel` / `pts` | `@map("created_at")`, `@@map(...)` | в схеме проекта `@map` не используется, просто `createdAt DateTime @default(now())`; `updatedAt` не нужен |
| `prel` | `onDelete: Cascade` | в проекте `@relation(fields: [userId], references: [id])` без `onDelete` |
| `rfc` / `rcc` | `<div>` внутри | подставьте нужный корневой тег |
| `rpage` | `export default async function Page()` | имя можно заменить на `ApplicationsPage` и т. п. |

## Чего в сниппетах нет, но на экзамене пригодится

Если захотите добавить в свой набор (могу написать `.code-snippets`-файл):
- `uas` — `useActionState`: `const [state, formAction, pending] = useActionState(action, initialState)`
- `sact` — заготовка server action с `'use server'`, чтением `formData` и `redirect`
- `fld` — блок `Field` с `FieldLabel`, `Input`, `FieldDescription`
- `ppage` — страница с `searchParams: Promise<…>`
- `pfm` / `pfu` — `prisma.x.findMany` / `findUnique`
