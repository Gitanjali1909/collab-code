import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null
let connectionAttempted = false

export function initializeSocket(projectId: string): Socket | null {
  if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
    console.log("[v0] Socket.io server URL not configured - running in local mode")
    return null
  }

  if (!socket && !connectionAttempted) {
    connectionAttempted = true

    // Connect to Socket.io server
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: false, // Disable reconnection attempts
    })

    socket.on("connect", () => {
      console.log("[v0] Socket connected:", socket?.id)
    })

    socket.on("disconnect", () => {
      console.log("[v0] Socket disconnected")
    })

    socket.on("connect_error", (error) => {
      console.log("[v0] Socket connection unavailable - running in local mode")
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
