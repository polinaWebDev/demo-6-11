'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { addReview as saveReview } from '@/lib/api/applications'

export async function addReview(applicationId: string, formData: FormData): Promise<void> {
  const session = await getSession()
  if (!session) {
    return
  }

  const saved = await saveReview(session.userId, applicationId, String(formData.get('review') ?? ''))
  if (saved) {
    revalidatePath('/applications')
  }
}
