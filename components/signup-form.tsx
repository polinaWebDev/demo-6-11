import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SignupForm({
  fieldErrors,
  pending,
  className,
  ...props
}: {
  fieldErrors?: Record<string, string>
  pending?: boolean
} & React.ComponentProps<"form">) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Создать аккаунт</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Заполните форму, чтобы зарегистрироваться
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="login">Логин</FieldLabel>
          <Input
            id="login"
            name="login"
            type="text"
            placeholder="user123"
            required
            className="bg-background"
          />
          <FieldDescription
            className={fieldErrors?.login ? "text-destructive" : undefined}
          >
            {fieldErrors?.login ??
              "Латинские буквы и цифры, не менее 6 символов."}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="fullName">ФИО</FieldLabel>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Иванов Иван Иванович"
            required
            className="bg-background"
          />
          <FieldDescription
            className={fieldErrors?.fullName ? "text-destructive" : undefined}
          >
            {fieldErrors?.fullName ?? "Кириллица и пробелы."}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="m@example.com"
            required
            className="bg-background"
          />
          <FieldDescription
            className={fieldErrors?.email ? "text-destructive" : undefined}
          >
            {fieldErrors?.email ?? "Ваш адрес электронной почты."}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="phone">Телефон</FieldLabel>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="8(999)123-45-67"
            required
            className="bg-background"
          />
          <FieldDescription
            className={fieldErrors?.phone ? "text-destructive" : undefined}
          >
            {fieldErrors?.phone ?? "Формат: 8(XXX)XXX-XX-XX."}
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Пароль</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            className="bg-background"
          />
          <FieldDescription
            className={fieldErrors?.password ? "text-destructive" : undefined}
          >
            {fieldErrors?.password ?? "Не менее 8 символов."}
          </FieldDescription>
        </Field>

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Создаём..." : "Создать пользователя"}
          </Button>
        </Field>

        <FieldDescription className="px-6 text-center">
          Уже есть аккаунт? <a href="/login">Войти</a>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
