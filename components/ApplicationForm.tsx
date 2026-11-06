'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { COURSE_LABELS, PAYMENT_LABELS } from '@/lib/labels'
import { createApplication, type NewApplicationState } from '@/app/(protected)/applications/new/actions'

const initialState: NewApplicationState = {}

export function ApplicationForm() {
  const [state, formAction, pending] = useActionState(createApplication, initialState)

  return (
    <form action={formAction} className="w-full max-w-sm">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Заявка на обучение</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Выберите курс и укажите желаемую дату начала
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="course">Курс</FieldLabel>
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
          {state.fieldErrors?.course && (
            <FieldDescription className="text-destructive">{state.fieldErrors.course}</FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="startDate">Дата начала обучения</FieldLabel>
          <Input id="startDate" name="startDate" placeholder="ДД.ММ.ГГГГ" className="bg-background" />
          {state.fieldErrors?.startDate ? (
            <FieldDescription className="text-destructive">{state.fieldErrors.startDate}</FieldDescription>
          ) : (
            <FieldDescription>Формат: ДД.ММ.ГГГГ.</FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="payment">Способ оплаты</FieldLabel>
          <Select name="payment">
            <SelectTrigger id="payment" className="w-full">
              <SelectValue placeholder="Выберите...">
                {(value: string) => PAYMENT_LABELS[value as keyof typeof PAYMENT_LABELS]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.payment && (
            <FieldDescription className="text-destructive">{state.fieldErrors.payment}</FieldDescription>
          )}
        </Field>

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? 'Отправляем...' : 'Отправить'}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
