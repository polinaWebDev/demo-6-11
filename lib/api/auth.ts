import 'server-only'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/password'
import { LOGIN_RE, FULL_NAME_RE, PHONE_RE, EMAIL_RE } from '@/lib/validation'
import type { Role } from '@/app/generated/prisma/enums'

export interface AuthUser {
  id: string
  role: Role
}

export interface RegisterInput {
  login: string
  password: string
  fullName: string
  phone: string
  email: string
}

export type RegisterResult =
  | { ok: true; user: AuthUser }
  | { ok: false; fieldErrors: Record<string, string> }

export type LoginResult = { ok: true; user: AuthUser } | { ok: false; error: string }

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const { login, password, fullName, phone, email } = input

  const fieldErrors: Record<string, string> = {}
  if (!LOGIN_RE.test(login)) {
    fieldErrors.login = 'Логин должен содержать только латинские буквы и цифры, не менее 6 символов'
  }
  if (password.length < 8) {
    fieldErrors.password = 'Пароль должен содержать не менее 8 символов'
  }
  if (!FULL_NAME_RE.test(fullName)) {
    fieldErrors.fullName = 'ФИО должно содержать только кириллицу и пробелы'
  }
  if (!PHONE_RE.test(phone)) {
    fieldErrors.phone = 'Телефон должен быть в формате 8(XXX)XXX-XX-XX'
  }
  if (!EMAIL_RE.test(email)) {
    fieldErrors.email = 'Некорректный адрес электронной почты'
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors }
  }

  const existing = await prisma.user.findUnique({ where: { login } })
  if (existing) {
    return { ok: false, fieldErrors: { login: 'Логин занят' } }
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { login, passwordHash, fullName, phone, email },
  })

  return { ok: true, user: { id: user.id, role: user.role } }
}

export async function loginUser(login: string, password: string): Promise<LoginResult> {
  if (!login || !password) {
    return { ok: false, error: 'Заполните все поля' }
  }

  const user = await prisma.user.findUnique({ where: { login } })
  if (!user) {
    return { ok: false, error: 'Пользователь не найден' }
  }

  const isValid = await verifyPassword(password, user.passwordHash)
  if (!isValid) {
    return { ok: false, error: 'Неверный логин или пароль' }
  }

  return { ok: true, user: { id: user.id, role: user.role } }
}
