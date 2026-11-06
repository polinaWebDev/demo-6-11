import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  formError,
  pending,
  className,
  ...props
}: {
  formError?: string
  pending?: boolean
} & React.ComponentProps<"form">) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Вход в аккаунт</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Введите логин и пароль, чтобы продолжить
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
        </Field>

        {formError && (
          <FieldDescription className="text-center text-destructive">
            {formError}
          </FieldDescription>
        )}

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Входим..." : "Войти"}
          </Button>
        </Field>

        <FieldDescription className="px-6 text-center">
          Еще не зарегистрированы? <a href="/register">Регистрация</a>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
