import 'server-only'
import { prisma } from '@/lib/prisma'
import type { Course, Status } from '@/app/generated/prisma/client'

export const PAGE_SIZE = 10

export interface ApplicationFilters {
  status?: Status
  course?: Course
  page: number
}

export async function listApplications({ status, course, page }: ApplicationFilters) {
  const where = {
    ...(status ? { status } : {}),
    ...(course ? { course } : {}),
  }

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.application.count({ where }),
  ])

  return { applications, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

export async function updateApplicationStatus(applicationId: string, status: Status): Promise<boolean> {
  try {
    await prisma.application.update({ where: { id: applicationId }, data: { status } })
    return true
  } catch {
    return false
  }
}
