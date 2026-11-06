# Часть 2. Фронтенд: страницы, формы и компоненты

Предполагается, что часть 1 (Prisma, `lib/`, API-слой `lib/api/`, actions) уже сделана: страницы только **вызывают** actions, берут данные через API-слой и показывают их. Напрямую к `prisma` страницы не обращаются.

Стек UI: Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui (стиль `base-mira`, под капотом **Base UI**, а не Radix), иконки `lucide-react`.

---

## Шаг 0. Как устроены маршруты

```
app/
  layout.tsx            корневой layout (html, шрифт, globals.css)
  page.tsx              «/» — заглушка
  login/page.tsx        «/login»          (клиентская страница с формой)
  register/page.tsx     «/register»       (клиентская страница с формой)
  (protected)/          группа: в URL не попадает, нужна для общего layout
    layout.tsx          проверка сессии для всего внутри
    applications/page.tsx      «/applications»      список своих заявок + отзыв
    applications/new/page.tsx  «/applications/new»  форма заявки
    admin/page.tsx             «/admin»             панель администратора
components/
  ui/…                  базовые компоненты shadcn (Button, Input, Field, Select, Table, Card…)
  login-form.tsx, signup-form.tsx, ApplicationForm.tsx, LabeledSelect.tsx, ImageSlider.tsx
```

Что говорить:
- `page.tsx` в папке — это страница, путь = путь папки.
- **Группа `(protected)`** — папка в скобках не меняет URL, но позволяет повесить общий `layout.tsx`. Здесь он проверяет сессию для `/applications`, `/applications/new` и `/admin` разом.
- Страницы по умолчанию **серверные** (async-компоненты: данные берут из API-слоя `lib/api/*`, а не из `prisma` напрямую). Директива `'use client'` нужна, только если используются хуки (`useState`, `useActionState`, `useEffect`) или обработчики событий.

---

## Шаг 1. Корневой layout и стили

**`app/layout.tsx`**: `<html lang="ru">`, шрифт Inter через `next/font/google` (кладётся в CSS-переменную `--font-sans`), общий `globals.css`. `cn` — маленькая утилита для склейки классов.

**`app/globals.css`**: `@import "tailwindcss"`, затем CSS-переменные темы (`--background`, `--primary`, `--destructive`…) и `@theme inline`, который делает их доступными как классы Tailwind (`bg-background`, `text-destructive`, `text-muted-foreground`). Поэтому в компонентах нет «сырых» цветов: смена темы делается в одном месте.

**`lib/utils.ts`**: `export { cn } from "cn"` (реэкспорт пакета `cn`).

> Замечание: часть файлов импортирует `cn` из `"cn"` напрямую (`login-form`, `signup-form`, `ImageSlider`), а `layout.tsx` — из `@/lib/utils`. Работает одинаково; для единообразия лучше везде `@/lib/utils`.

---

## Шаг 2. Базовые UI-компоненты — `components/ui/*`

Это сгенерированные shadcn-компоненты (`npx shadcn add button input …`), их мы не пишем руками. Конфиг — `components.json` (стиль `base-mira`, алиасы `@/components`, `@/lib/utils`).

Что используется:
- `Button`, `Input`, `Textarea`, `Label`
- `Field`, `FieldGroup`, `FieldLabel`, `FieldDescription` — обёртка «подпись + поле + подсказка/ошибка»
- `Select*` — выпадающий список
- `Card*`, `Table*`

**Особенность Base UI**: чтобы сделать из кнопки ссылку, используется проп `render`, а не `asChild`:
```tsx
<Button render={<Link href="/admin" />} nativeButton={false} variant="outline">
  Панель администратора
</Button>
```
`nativeButton={false}` сообщает, что внутри не `<button>`, а ссылка.

---

## Шаг 3. Формы входа и регистрации

Здесь повторяется один и тот же паттерн, его надо понять один раз.

### Разделение на две части
- **Страница** (`app/login/page.tsx`, `'use client'`) — держит состояние формы через `useActionState`.
- **Форма** (`components/login-form.tsx`) — «глупый» компонент: получает `action`, `formError`, `pending` через пропсы и только рисует поля.

```tsx
'use client'
const initialState: LoginState = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState)
  return (
    …
    <LoginForm action={formAction} formError={state.formError} pending={pending} />
    …
  )
}
```

### `useActionState(action, initialState)` возвращает
| Значение | Что это |
|---|---|
| `state` | то, что вернул action в прошлый раз (у нас — объект с ошибками) |
| `formAction` | функция, которую нужно передать в `<form action={…}>` |
| `pending` | `true`, пока action выполняется: блокируем кнопку, меняем текст |

Поэтому в части 1 у `login` и `register` сигнатура `(prevState, formData)`.

### Как форма отправляется
`<form {...props}>` получает `action={formAction}` через `...props`. Поля читаются на сервере по атрибуту **`name`** (`name="login"`, `name="password"`), а не по `id`. `id` + `htmlFor` нужны только для связи с подписью.

### Ошибки
- Вход: одна общая ошибка `formError` под полями.
- Регистрация: `fieldErrors` по полям. Под каждым полем `FieldDescription`: если есть ошибка, показываем её красным (`text-destructive`), иначе — подсказку по формату:
  ```tsx
  <FieldDescription className={fieldErrors?.login ? "text-destructive" : undefined}>
    {fieldErrors?.login ?? "Латинские буквы и цифры, не менее 6 символов."}
  </FieldDescription>
  ```
- `required` и `type="email"`/`"tel"`/`"password"` — только удобство в браузере. Настоящая проверка всё равно на сервере (часть 1).

### Двухколоночная раскладка
```tsx
<div className="grid min-h-svh lg:grid-cols-2">
  <div className="flex items-center justify-center p-6 md:p-10"> форма </div>
  <div className="relative hidden lg:block"> <ImageSlider/> </div>
</div>
```
На узких экранах одна колонка, слайдер скрыт (`hidden`), с `lg` (≥1024px) — две колонки.

---

## Шаг 4. Слайдер — `components/ImageSlider.tsx`

Требование экзамена: автопрокрутка + переключение стрелками + точки. Реализация на чистом React без библиотек.

```tsx
// index — номер текущего слайда (0, 1, 2, 3), setIndex — функция, которая его меняет.
// Начинаем с 0, то есть с первого слайда.
const [index, setIndex] = useState(0)

// next — «следующий слайд».
// useCallback(fn, []) — запоминает функцию, чтобы при каждом рендере
//   не создавалась новая (пустой массив [] = «никогда не пересоздавать»).
//   Это важно, потому что next стоит в зависимостях useEffect ниже:
//   новая функция на каждый рендер перезапускала бы таймер.
// setIndex(c => ...) — «функциональная» форма: c — это актуальное
//   текущее значение index. Так надёжнее, чем писать index + 1,
//   потому что не зависит от «устаревшего» значения в замыкании.
// (c + 1) — переходим на следующий номер.
// % SLIDES.length — остаток от деления на количество слайдов (4).
//   Он «замыкает» счёт по кругу:
//     c = 0 → (0+1) % 4 = 1
//     c = 1 → (1+1) % 4 = 2
//     c = 2 → (2+1) % 4 = 3
//     c = 3 → (3+1) % 4 = 0   ← после последнего слайда снова первый
const next = useCallback(() => setIndex(c => (c + 1) % SLIDES.length), [])

// prev — «предыдущий слайд».
// (c - 1) — шаг назад. Но у первого слайда это даст -1,
//   а в JS остаток от отрицательного числа тоже отрицательный: -1 % 4 = -1
//   (а номера слайда -1 не существует).
// + SLIDES.length — прибавляем 4, чтобы число стало неотрицательным
//   (c - 1 + 4 всегда >= 0), и только потом берём % SLIDES.length:
//     c = 3 → (3-1+4) % 4 = 6 % 4 = 2
//     c = 1 → (1-1+4) % 4 = 4 % 4 = 0
//     c = 0 → (0-1+4) % 4 = 3 % 4 = 3   ← «назад» с первого слайда — на последний
const prev = useCallback(() => setIndex(c => (c - 1 + SLIDES.length) % SLIDES.length), [])

useEffect(() => {
  // Каждые AUTO_DELAY (3000 мс = 3 секунды) вызываем next — автопрокрутка.
  const id = setInterval(next, AUTO_DELAY)
  // Функция очистки: React вызовет её перед повторным запуском эффекта
  // и при удалении компонента — таймер останавливается, утечек нет.
  return () => clearInterval(id)
  // Эффект перезапускается, когда меняется next или index.
  // index в списке нужен, чтобы после ручного клика отсчёт 3 секунд начался заново.
}, [next, index])
```

Про `%` (остаток от деления) в двух словах: `a % n` — это то, что остаётся после деления `a` на `n`. Результат всегда в диапазоне от `0` до `n - 1`, поэтому номер слайда никогда не выйдет за пределы списка (`5 % 4 = 1`, `4 % 4 = 0`).

Ключевые идеи:
- **Состояние** — только номер текущего слайда.
- **Закольцовывание** — остаток от деления `% SLIDES.length`; для «назад» добавляем `+ SLIDES.length`, чтобы не получить `-1`.
- **Автопрокрутка** — `setInterval` в `useEffect`, обязательно с очисткой в `return`.
- `index` в зависимостях эффекта: при клике пользователя таймер перезапускается, и слайд не перескакивает сразу после клика.
- **Плавная смена**: все картинки лежат друг на друге (`<Image fill>` внутри `relative overflow-hidden`), у активной `opacity-100`, у остальных `opacity-0`, плюс `transition-opacity duration-700`.
- `Image` из `next/image` с `fill` + `sizes="50vw"` (слайдер занимает половину экрана), `priority` у первого слайда — он виден сразу.
- Стрелки и точки — обычные `<button type="button">` с `aria-label` (доступность). Позиционируются абсолютно: `absolute top-1/2 -translate-y-1/2`.
- Картинки лежат в `public/images/slider/*.webp`, путь в коде начинается с `/images/...` (без `public`).

Используется на `/login` и `/register`.

---

## Шаг 5. Список заявок пользователя — `app/(protected)/applications/page.tsx`

Серверный async-компонент, без `'use client'`:

```tsx
const session = await getSession()
if (!session) return null
const applications = await listUserApplications(session.userId)   // lib/api/applications.ts
```

- Данные берутся **прямо в компоненте**, без `useEffect` и fetch — это серверный компонент. Запрос спрятан в API-слое (`lib/api/applications.ts`).
- Внутри `listUserApplications` стоит фильтр `where: { userId }`: пользователь видит только свои заявки. `userId` страница берёт из сессии.
- Значения enum превращаются в текст через словари: `COURSE_LABELS[application.course]`, `STATUS_LABELS[...]`, `formatDate(...)`.
- Условный рендер:
  - заявок нет → «У вас пока нет заявок»;
  - есть `review` → показываем отзыв;
  - статус `completed` и отзыва ещё нет → форма отзыва.
- Кнопка «Панель администратора» видна только если `session.role === 'admin'`.
- «Выйти» — это `<form action={logout}>` с кнопкой `type="submit"`: вызывать серверный action можно прямо из `action` формы.

### Форма отзыва и `.bind`

Проблема: форма передаёт в action только `formData` (поля с атрибутом `name`), а `addReview` нужны два аргумента — `(applicationId, formData)`. Форма отзыва рисуется для каждой заявки в списке, и action должен знать, к какой именно заявке относится отзыв. Решение — `.bind`.

```typescript
// Обычная функция с двумя параметрами
function addReview(applicationId, formData) {
  console.log('заявка:', applicationId, 'данные:', formData)
}

// bind(thisArg, ...заранее заданные аргументы)
// Возвращает НОВУЮ функцию. Старая addReview не меняется.
const addReviewForAbc = addReview.bind(null, 'abc')
//                                      │     └─ 1-й аргумент, applicationId, подставлен заранее
//                                      └─ значение this внутри функции;
//                                         в addReview this не используется, поэтому null

// Теперь в новой функции остался один параметр, formData:
addReviewForAbc('текст отзыва')
// то же самое, что: addReview('abc', 'текст отзыва')
// → заявка: abc данные: текст отзыва

// Для другой заявки делаем другую копию:
const addReviewForXyz = addReview.bind(null, 'xyz')
addReviewForXyz('другой отзыв')
// → заявка: xyz данные: другой отзыв

// То же самое без bind — обычная стрелочная функция-обёртка:
const addReviewForAbc2 = (formData) => addReview('abc', formData)
```

Как это выглядит в форме:

```tsx
{applications.map((application) => (
  // На каждой итерации application.id свой, поэтому для каждой карточки
  // создаётся своя функция с «зашитым» id:
  //   карточка 1 → addReview.bind(null, 'id-1')
  //   карточка 2 → addReview.bind(null, 'id-2')
  <form action={addReview.bind(null, application.id)}>
    <Textarea name="review" required />   {/* попадёт в formData */}
    <Button type="submit">Отправить отзыв</Button>
  </form>
))}

// При нажатии кнопки React вызывает функцию из action и САМ
// передаёт ей один аргумент, formData (все поля формы с атрибутом name).
// В итоге выполняется:
//   addReview('id-1', formData)
//   то есть applicationId уже был подставлен bind'ом,
//   а formData добавил React при отправке.
```

Три момента:
- **`bind` ничего не вызывает.** Он только готовит новую функцию, а вызовет её сама форма при отправке.
- **Подставляются первые аргументы по порядку.** Поэтому в `addReview` `applicationId` стоит первым, а `formData` — вторым. Если поменять их местами, `bind` сработает неправильно.
- **`null`** — первый параметр `bind`, значение `this`. К аргументам функции он отношения не имеет: аргументы идут со второго параметра.

Альтернатива — скрытое поле `<input type="hidden" name="applicationId" value={application.id} />`, как сделано в админке для `updateStatus`. В обоих случаях id приходит от клиента, поэтому доверять ему нельзя: в `addReview` проверяется, что заявка принадлежит текущему пользователю и имеет статус `completed` (часть 1).

После успешного `addReview` срабатывает `revalidatePath('/applications')`, и отзыв появляется на странице без ручной перезагрузки.

---

## Шаг 6. Создание заявки

**`applications/new/page.tsx`** — серверная страница-обёртка, просто центрирует `<ApplicationForm />`.

**`components/ApplicationForm.tsx`** (`'use client'`) — тот же паттерн `useActionState(createApplication, initialState)`.

Три поля:
1. **Курс** — `Select name="course"`.
2. **Дата начала** — текстовый `Input name="startDate"` с плейсхолдером `ДД.ММ.ГГГГ` (формат по ТЗ, поэтому не `type="date"`).
3. **Способ оплаты** — `Select name="payment"`.

Как работает `Select`:
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
- Пункты строятся из словаря `COURSE_LABELS`, поэтому новый курс в `labels.ts` автоматически появится в списке.
- Атрибут `name` у `Select` добавляет скрытое поле в форму, и значение уходит в `formData` как у обычного `<select>`.
- Функция внутри `SelectValue` показывает в закрытом состоянии **русскую подпись**, а не значение enum. Разберём конструкцию `value as keyof typeof COURSE_LABELS`:

```ts
// В lib/labels.ts:
export const COURSE_LABELS: Record<Course, string> = {
  algorithms: 'Основы алгоритмизации и программирования',
  webdesign: 'Основы веб-дизайна',
  databases: 'Основы проектирования баз данных',
}

// Select отдаёт нам value типа string — «какая-то строка».
// А COURSE_LABELS можно индексировать не любой строкой, а только тремя ключами.
// Поэтому COURSE_LABELS[value] — ошибка TypeScript: строка "foo" тоже string,
// но такого ключа в объекте нет.

// Разбираем выражение по частям, справа налево:

typeof COURSE_LABELS
// typeof в ТИПАХ (не путать с typeof в обычном JS, который возвращает 'string'/'number'):
// «возьми тип вот этой переменной».
// Результат: Record<Course, string>
//   = объект, где ключи 'algorithms' | 'webdesign' | 'databases', значения string.

keyof typeof COURSE_LABELS
// keyof — «возьми ключи этого типа и собери из них объединение».
// Результат: 'algorithms' | 'webdesign' | 'databases'

value as keyof typeof COURSE_LABELS
// as — «утверждение типа»: говорим TypeScript «поверь мне, эта string — одно из
// трёх значений выше». Это ТОЛЬКО подсказка для компилятора: в готовом JS-коде
// as исчезает и ничего не проверяет.

COURSE_LABELS[value as keyof typeof COURSE_LABELS]
// Теперь индексация разрешена, и результат — string (подпись курса).
```

Вместе: «значение из селекта — просто `string`, но мы знаем, что это ключ словаря `COURSE_LABELS`; сообщаем это TypeScript и достаём подпись».

Почему `as` безопасен именно здесь: пункты списка строятся из `Object.entries(COURSE_LABELS)`, то есть другого значения селект выдать не может. Поэтому приведение типа верное. В `createApplication` (часть 1) такое же `as Course` **не** защищает — там значение пришло из формы, и его проверяют вручную через `VALID_COURSES.includes(...)`.

Эквивалентно можно записать короче, через готовый тип из Prisma: `COURSE_LABELS[value as Course]` (`Course` = `'algorithms' | 'webdesign' | 'databases'`). Результат тот же, `keyof typeof` просто выводит этот тип из самого словаря.
- Ошибки по полям (`state.fieldErrors?.course` и т. д.) показываются под соответствующим полем.

---

## Шаг 7. Панель администратора — `app/(protected)/admin/page.tsx`

Самая насыщенная страница. Разберём по частям.

### 7.1 Проверка прав
```tsx
const session = await getSession()
if (!session || session.role !== 'admin') redirect('/login')
```
Третий слой защиты (первый — `proxy.ts`, второй — layout группы).

### 7.2 Параметры из URL (фильтры и страница)
Состояние фильтров и пагинации хранится **в адресной строке**: `/admin?status=new&course=webdesign&page=2`.

- В Next 16 `searchParams` — это **Promise**: `const params = await searchParams`.
- Значения из URL не доверенные, поэтому каждое проверяется: `params.status in STATUS_LABELS`, номер страницы — `Number.isFinite` и `>= 1`. Неверное значение превращается в «нет фильтра».
- Тип строится так, чтобы в Prisma попало только допустимое значение enum.

### 7.3 Запрос с фильтром и пагинацией
Страница передаёт уже проверенные значения в API-слой и получает готовый результат:
```tsx
const { applications, totalPages } = await listApplications({ status, course, page })   // lib/api/admin.ts
```
А внутри `lib/api/admin.ts`:
```ts
export const PAGE_SIZE = 10

const where = { ...(status ? { status } : {}), ...(course ? { course } : {}) }

const [applications, total] = await Promise.all([
  prisma.application.findMany({
    where, include: { user: true },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
  }),
  prisma.application.count({ where }),
])
return { applications, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
```
- `include: { user: true }` подтягивает автора заявки (нужно ФИО).
- `skip`/`take` — классическая пагинация. `count` с тем же `where` даёт общее число для «Страница X из Y».
- `Promise.all` выполняет два запроса параллельно.
- Разбор `searchParams` (что в URL — «грязные» данные) остаётся на странице, а запрос — в API-слое.

### 7.4 Форма фильтров (обычный GET)
```tsx
<form method="GET"> … <LabeledSelect name="status" … /> <LabeledSelect name="course" … /> <Button type="submit">Применить</Button> </form>
```
Никакого JavaScript: GET-форма сама превращает значения полей в query-строку. Номер страницы в форму не входит, поэтому после смены фильтра пользователь попадает на страницу 1 — то, что нужно.

Варианты «Все статусы»/«Все курсы» — это те же словари с добавленным ключом `all`:
```tsx
const STATUS_FILTER_LABELS = { all: 'Все статусы', ...STATUS_LABELS }
```

### 7.5 `LabeledSelect` — переиспользуемый компонент
`components/LabeledSelect.tsx` (`'use client'`): принимает `name`, `defaultValue`, словарь `labels`, `ariaLabel`, `className`, `size`. Нужен потому, что `Select` — клиентский компонент, а страница серверная. Используется и для фильтров, и для выбора статуса в строках таблицы.

### 7.6 Таблица и смена статуса
Для каждой заявки в ячейке «Статус» своя маленькая форма:
```tsx
<form action={updateStatus}>
  <input type="hidden" name="applicationId" value={application.id} />
  <input type="hidden" name="redirectTo" value={currentUrl} />
  <LabeledSelect name="status" defaultValue={application.status} … />
  <Button type="submit">Сохранить</Button>
</form>
```
- Скрытые поля передают в action `id` заявки и адрес, куда вернуться (с сохранением текущих фильтров и страницы).
- После сохранения action редиректит на этот адрес с `?updated=true`, а страница показывает зелёное сообщение «Статус заявки обновлён» (`params.updated === 'true'`).
- Таблица обёрнута в `overflow-x-auto` + `min-w-[640px]`: на телефоне она прокручивается горизонтально, а не ломает вёрстку.

### 7.7 Пагинация
`buildUrl(targetPage)` собирает адрес через `URLSearchParams`, сохраняя активные фильтры. «Назад» на первой странице и «Вперёд» на последней — отключённые кнопки (`disabled`), в остальных случаях — кнопка-ссылка (`render={<Link href=… />}`).

---

## Шаг 8. Что осталось недоделанным (честно)

- `app/page.tsx` («/») — заглушка с заголовком, без редиректа на `/login` или `/applications`.
- Ссылки между логином и регистрацией сделаны через `<a href>`, а не `next/link` (работает, но с полной перезагрузкой страницы).
- `metadata.title` в layout — «test-demo-next».
- Поле даты в `ApplicationForm` не имеет `required`, и ни на фронте, ни в action нет проверки, что дата не в прошлом (ТЗ нужно сверить).

---

## Шпаргалка: порядок действий на экзамене (фронтенд)

1. `layout.tsx` + `globals.css`; `npx shadcn@latest add button input field select card table textarea label`.
2. Форма входа и страница `/login` (паттерн `useActionState`) — на ней отработать схему «страница + форма + action».
3. Регистрация по тому же образцу + ошибки по полям.
4. Слайдер и вставка на обе страницы.
5. `(protected)/layout.tsx` с проверкой сессии.
6. `/applications`: список, пустое состояние, форма отзыва через `.bind`.
7. `/applications/new`: форма с `Select` и датой.
8. `/admin`: фильтры через GET, таблица, смена статуса, пагинация.
9. Проверить адаптив (телефон/планшет) и `npm run lint` + `npx tsc --noEmit`.

## Частые ошибки

- Забыть `name` у полей: `formData.get(...)` вернёт `null`.
- Использовать хуки в серверном компоненте (нужен `'use client'`) или, наоборот, ставить `'use client'` на страницу, которой нужны данные из `lib/api` (там `server-only`).
- Не очистить `setInterval` в слайдере.
- Забыть `await` у `searchParams` (в Next 16 это Promise).
- Показывать значения enum вместо русских подписей.
- Забыть `type="submit"` у кнопки выхода/отправки или `type="button"` у кнопок слайдера внутри форм.
- Положить картинки не в `public/` или указать в `src` путь с `public/`.
