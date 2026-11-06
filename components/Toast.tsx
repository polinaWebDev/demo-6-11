"use client"

import { useEffect, useState } from "react"

export function Toast({ message, duration = 3000 }: { message: string; duration?: number }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has("updated")) {
      url.searchParams.delete("updated")
      window.history.replaceState(null, "", url.pathname + url.search)
    }
    const id = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(id)
  }, [duration])

  if (!visible) return null

  return (
    <div
      role="status"
      className="fixed top-4 right-4 left-4 z-50 mx-auto max-w-sm rounded-lg bg-emerald-600 px-4 py-3 text-sm text-white shadow-lg sm:left-auto sm:mx-0"
    >
      {message}
    </div>
  )
}
