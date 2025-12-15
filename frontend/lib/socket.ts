import { io } from "socket.io-client"
import type { Socket } from "socket.io-client"

let socket: Socket | null = null
let connectionAttempted = false

export function initializeSocket(projectId: string): Socket | null {
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL

  if (!SOCKET_URL) {
    console.log("Socket URL not configured — running local")
    return null
  }

  if (!socket && !connectionAttempted) {
    connectionAttempted = true

    socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: false,
    })

    socket.on("connect", () => {
      console.log("Socket connected:", socket?.id)
      socket?.emit("join", { projectId })
    })

    socket.on("disconnect", () => {
      console.log("Socket disconnected")
    })

    socket.on("connect_error", (error: Error) => {
      console.log("Socket unavailable — local mode")
      socket = null
    })
  }

  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  connectionAttempted = false
}
