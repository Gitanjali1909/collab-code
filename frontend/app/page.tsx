"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Generate a random project ID and redirect to editor
    const projectId = Math.random().toString(36).substring(2, 15)
    router.push(`/editor/${projectId}`)
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Loading Editor...</h1>
        <p className="mt-2 text-sm text-muted-foreground">Creating new project</p>
      </div>
    </div>
  )
}
