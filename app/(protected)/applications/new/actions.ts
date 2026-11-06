'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { createApplication as createApplicationRecord } from '@/lib/api/applications'

export interface NewApplicationState {
  fieldErrors?: Record<string, string>
}

export async function createApplication(
  _prevState: NewApplicationState,
  formData: FormData,
): Promise<NewApplicationState> {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const result = await createApplicationRecord(session.userId, {
    course: String(formData.get('course') ?? ''),
    startDate: String(formData.get('startDate') ?? ''),
    payment: String(formData.get('payment') ?? ''),
  })

  if (!result.ok) {
    return { fieldErrors: result.fieldErrors }
  }

  redirect('/applications')
}
