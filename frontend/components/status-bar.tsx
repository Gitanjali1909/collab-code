"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { initializeSocket } from "@/lib/socket"

interface StatusBarProps {
  projectId: string
}

export function StatusBar({ projectId }: StatusBarProps) {
  const [userCount, setUserCount] = useState(0)

  useEffect(() => {
    const socket = initializeSocket(projectId)

    if (!socket) {
      return
    }

    socket.emit("join-project", { projectId })

    socket.on("users-update", (users: any[]) => {
      setUserCount(users.length)
    })

    socket.on("user-joined", () => {
      setUserCount((prev) => prev + 1)
    })

    socket.on("user-left", () => {
      setUserCount((prev) => Math.max(0, prev - 1))
    })

    return () => {
      socket.off("users-update")
      socket.off("user-joined")
      socket.off("user-left")
    }
  }, [projectId])

  return (
    <header className="flex items-center justify-between border-b bg-gray-900 px-4 py-2">
      <h1 className="text-sm font-semibold">
        Real-time Code Editor
        <span className="ml-2 text-xs text-gray-500">ID: {projectId.slice(0, 8)}</span>
      </h1>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
        <span className="text-2xl">🟢</span>
        <span className="text-sm font-medium">
          {userCount > 0 ? `${userCount} ${userCount === 1 ? "person" : "people"} editing` : "Local mode"}
        </span>
      </motion.div>
    </header>
  )
}
