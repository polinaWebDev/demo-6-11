import 'server-only'
import { prisma } from '@/lib/prisma'
import { VALID_COURSES, VALID_PAYMENTS } from '@/lib/labels'
import { DATE_RE } from '@/lib/validation'
import type { Course, Payment } from '@/app/generated/prisma/client'

export interface ApplicationInput {
  course: string
  startDate: string
  payment: string
}

export type CreateApplicationResult = { ok: true } | { ok: false; fieldErrors: Record<string, string> }

export function listUserApplications(userId: string) {
  return prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createApplication(
  userId: string,
  input: ApplicationInput,
): Promise<CreateApplicationResult> {
  const fieldErrors: Record<string, string> = {}

  const course = input.course as Course
  if (!VALID_COURSES.includes(course)) {
    fieldErrors.course = 'Выберите один из предложенных курсов'
  }
  const dateMatch = DATE_RE.exec(input.startDate)
  if (!dateMatch) {
    fieldErrors.startDate = 'Укажите дату начала обучения'
  }
  const payment = input.payment as Payment
  if (!VALID_PAYMENTS.includes(payment)) {
    fieldErrors.payment = 'Выберите способ оплаты'
  }

  if (Object.keys(fieldErrors).length > 0 || !dateMatch) {
    return { ok: false, fieldErrors }
  }

  const [, year, month, day] = dateMatch
  const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))

  await prisma.application.create({
    data: { userId, course, startDate, payment },
  })

  return { ok: true }
}

export async function addReview(userId: string, applicationId: string, review: string): Promise<boolean> {
  const text = review.trim()
  if (!text) {
    return false
  }

  const application = await prisma.application.findUnique({ where: { id: applicationId } })
  if (!application || application.userId !== userId || application.status !== 'completed') {
    return false
  }

  await prisma.application.update({ where: { id: applicationId }, data: { review: text } })
  return true
}
