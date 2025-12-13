"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { initializeSocket } from "@/lib/socket"

interface CollaboratorsProps {
  projectId: string
}

interface User {
  id: string
  name: string
  color: string
  cursor?: {
    line: number
    column: number
  }
}

export function Collaborators({ projectId }: CollaboratorsProps) {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const socket = initializeSocket(projectId)

    if (!socket) {
      console.log("[v0] Collaborators running in local mode")
      return
    }

    // Join the project room
    socket.emit("join-project", { projectId })

    // Listen for user list updates
    socket.on("users-update", (activeUsers: User[]) => {
      setUsers(activeUsers)
    })

    // Listen for user joined
    socket.on("user-joined", (user: User) => {
      setUsers((prev) => [...prev, user])
    })

    // Listen for user left
    socket.on("user-left", (userId: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    })

    return () => {
      socket.emit("leave-project", { projectId })
      socket.off("users-update")
      socket.off("user-joined")
      socket.off("user-left")
    }
  }, [projectId])

  if (users.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Local mode</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {users.length} {users.length === 1 ? "collaborator" : "collaborators"}
      </span>
      <div className="flex -space-x-2">
        <AnimatePresence>
          {users.map((user) => (
            <motion.div
              key={user.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-xs font-medium text-white"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
