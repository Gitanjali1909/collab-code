"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { initializeYjs } from "@/lib/yjs"
import { initializeSocket } from "@/lib/socket"

interface CodeEditorProps {
  projectId: string
}

export function CodeEditor({ projectId }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true

    const initEditor = async () => {
      if (!editorRef.current) return

      // Dynamically import Monaco editor
      const monaco = await import("monaco-editor")

      if (!mounted || !editorRef.current) return

      // Create editor instance
      const editor = monaco.editor.create(editorRef.current, {
        value: "// Start coding...\n",
        language: "typescript",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        renderWhitespace: "selection",
        scrollBeyondLastLine: false,
      })

      monacoRef.current = editor

      const yjsProvider = await initializeYjs(projectId, editor)

      // Initialize Socket.io for real-time updates
      const socket = initializeSocket(projectId)

      // Listen for cursor updates from other users
      socket.on("cursor-update", (data: any) => {
        console.log("[v0] Received cursor update:", data)
        // Handle remote cursor rendering
      })

      // Emit cursor position changes
      editor.onDidChangeCursorPosition((e) => {
        socket.emit("cursor-move", {
          projectId,
          position: e.position,
        })
      })
    }

    initEditor()

    return () => {
      mounted = false
      if (monacoRef.current) {
        monacoRef.current.dispose()
      }
    }
  }, [projectId])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full w-full"
    >
      <div ref={editorRef} className="h-full w-full" />
    </motion.div>
  )
}
