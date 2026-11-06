import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from '@/lib/session'

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('session')?.value ?? null
  const session = await verifySession(token)

  if (!session || session.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/admin/:path*'],
}
