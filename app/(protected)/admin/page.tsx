import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LabeledSelect } from '@/components/LabeledSelect'
import { Toast } from '@/components/Toast'
import { getSession } from '@/lib/session'
import { listApplications } from '@/lib/api/admin'
import { COURSE_LABELS, PAYMENT_LABELS, STATUS_LABELS, formatDate } from '@/lib/labels'
import { updateStatus } from './actions'
import { logout } from '@/app/logout/actions'
import type { Course, Status } from '@/app/generated/prisma/client'

const STATUS_FILTER_LABELS: Record<string, string> = { all: 'Все статусы', ...STATUS_LABELS }
const COURSE_FILTER_LABELS: Record<string, string> = { all: 'Все курсы', ...COURSE_LABELS }

interface AdminPageProps {
  searchParams: Promise<{ status?: string; course?: string; page?: string; updated?: string }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    redirect('/login')
  }

  const params = await searchParams
  const status =
    params.status && params.status !== 'all' && params.status in STATUS_LABELS
      ? (params.status as Status)
      : undefined
  const course =
    params.course && params.course !== 'all' && params.course in COURSE_LABELS
      ? (params.course as Course)
      : undefined
  const pageNum = Number(params.page)
  const page = Number.isFinite(pageNum) && pageNum >= 1 ? Math.floor(pageNum) : 1

  const { applications, totalPages } = await listApplications({ status, course, page })

  function buildUrl(targetPage: number): string {
    const query = new URLSearchParams()
    if (status) query.set('status', status)
    if (course) query.set('course', course)
    query.set('page', String(targetPage))
    return `/admin?${query.toString()}`
  }

  const currentUrl = buildUrl(page)

  return (
    <div className="flex min-h-svh w-full flex-col items-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Панель администратора</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button render={<Link href="/applications" />} nativeButton={false} variant="outline">
            Мои заявки
          </Button>
          <form action={logout}>
            <Button type="submit" variant="outline">Выйти</Button>
          </form>
        </div>
      </div>

      {params.updated === 'true' && <Toast key={currentUrl} message="Статус заявки обновлён" />}

      <form method="GET" className="flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:flex-wrap">
        <LabeledSelect
          name="status"
          defaultValue={status ?? 'all'}
          labels={STATUS_FILTER_LABELS}
          ariaLabel="Фильтр по статусу"
          className="w-full sm:w-48"
        />
        <LabeledSelect
          name="course"
          defaultValue={course ?? 'all'}
          labels={COURSE_FILTER_LABELS}
          ariaLabel="Фильтр по курсу"
          className="w-full sm:w-64"
        />
        <Button type="submit" variant="secondary">
          Применить
        </Button>
      </form>

      <div className="w-full max-w-6xl overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Курс</TableHead>
              <TableHead>Дата начала</TableHead>
              <TableHead>Оплата</TableHead>
              <TableHead>Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id}>
                <TableCell>{application.user.fullName}</TableCell>
                <TableCell>{COURSE_LABELS[application.course]}</TableCell>
                <TableCell>{formatDate(application.startDate)}</TableCell>
                <TableCell>{PAYMENT_LABELS[application.payment]}</TableCell>
                <TableCell>
                  <form action={updateStatus} className="flex items-center gap-2">
                    <input type="hidden" name="applicationId" value={application.id} />
                    <input type="hidden" name="redirectTo" value={currentUrl} />
                    <LabeledSelect
                      name="status"
                      defaultValue={application.status}
                      labels={STATUS_LABELS}
                      ariaLabel="Статус заявки"
                      size="sm"
                      className="w-44"
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      Сохранить
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-3">
        {page <= 1 ? (
          <Button variant="secondary" disabled>
            Назад
          </Button>
        ) : (
          <Button variant="secondary" render={<Link href={buildUrl(page - 1)} />} nativeButton={false}>
            Назад
          </Button>
        )}
        <span className="text-sm text-muted-foreground">Страница {page} из {totalPages}</span>
        {page >= totalPages ? (
          <Button variant="secondary" disabled>
            Вперёд
          </Button>
        ) : (
          <Button variant="secondary" render={<Link href={buildUrl(page + 1)} />} nativeButton={false}>
            Вперёд
          </Button>
        )}
      </div>
    </div>
  )
}
