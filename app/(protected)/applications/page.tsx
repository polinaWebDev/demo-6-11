import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { getSession } from '@/lib/session'
import { listUserApplications } from '@/lib/api/applications'
import { COURSE_LABELS, PAYMENT_LABELS, STATUS_LABELS, formatDate } from '@/lib/labels'
import { addReview } from './actions'
import { logout } from '@/app/logout/actions'

export default async function ApplicationsPage() {
  const session = await getSession()
  if (!session) {
    return null
  }

  const applications = await listUserApplications(session.userId)

  return (
    <div className="flex min-h-svh w-full flex-col items-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Мои заявки</h1>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/applications/new" />} nativeButton={false}>Оформить заявку</Button>
          <form action={logout}>
            <Button type="submit" variant="outline">Выйти</Button>
          </form>
        </div>
      </div>

      {applications.length === 0 ? (
        <p className="text-sm text-muted-foreground">У вас пока нет заявок</p>
      ) : (
        <ul className="flex w-full max-w-lg flex-col gap-4">
          {applications.map((application) => (
            <li key={application.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{COURSE_LABELS[application.course]}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-left">
                  <p className="text-sm text-muted-foreground">
                    Дата начала: {formatDate(application.startDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Оплата: {PAYMENT_LABELS[application.payment]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Статус: {STATUS_LABELS[application.status]}
                  </p>
                  {application.review && (
                    <p className="mt-2 text-sm italic">Ваш отзыв: {application.review}</p>
                  )}
                  {application.status === 'completed' && !application.review && (
                    <form action={addReview.bind(null, application.id)} className="mt-2 flex flex-col gap-2">
                      <Textarea
                        name="review"
                        placeholder="Оставьте отзыв о качестве обучения"
                        rows={3}
                        required
                      />
                      <Button type="submit" className="self-start">
                        Отправить отзыв
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
