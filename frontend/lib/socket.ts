import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export function initializeSocket(projectId: string): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      transports: ["websocket", "polling"],
      autoConnect: true,
    })

    socket.on("connect", () => {
      console.log("[v0] Socket connected:", socket?.id)
    })

    socket.on("disconnect", () => {
      console.log("[v0] Socket disconnected")
    })

    socket.on("connect_error", (error: unknown) => {
      console.error("[v0] Socket connection error:", error)
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
}
