"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { initializeYjs } from "@/lib/yjs"
import { initializeSocket } from "@/lib/socket"

interface CodeEditorProps {
  projectId: string
  onRunCode: (html: string) => void
}

export function CodeEditor({ projectId, onRunCode }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<any>(null)

  const generateHTML = () => {
    if (!monacoRef.current) return

    const code = monacoRef.current.getValue()

    // Parse code sections - assuming format with HTML, CSS, JS comments
    let html = ""
    let css = ""
    let js = ""

    // Simple parsing - split by common delimiters or use entire code as HTML
    if (code.includes("/* CSS */") || code.includes("// CSS")) {
      const parts = code.split(/\/\*\s*CSS\s*\*\/|\/\/\s*CSS/i)
      html = parts[0] || ""
      const rest = parts[1] || ""

      if (rest.includes("/* JS */") || rest.includes("// JS")) {
        const jsParts = rest.split(/\/\*\s*JS\s*\*\/|\/\/\s*JS/i)
        css = jsParts[0] || ""
        js = jsParts[1] || ""
      } else {
        css = rest
      }
    } else {
      html = code
    }

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<style>${css}</style>
</head>
<body>
${html}
<script>${js}</script>
</body>
</html>`

    onRunCode(fullHTML)
  }

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

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        generateHTML()
      })

      // Initialize Yjs for collaborative editing
      try {
        const yjsProvider = await initializeYjs(projectId, editor)
      } catch (error) {
        console.log("[v0] Yjs not available - continuing in local mode")
      }

      // Initialize Socket.io for real-time updates
      const socket = initializeSocket(projectId)

      if (socket) {
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
      className="flex h-full w-full flex-col"
    >
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">Code Editor</h2>
        <button
          onClick={generateHTML}
          className="flex items-center gap-2 rounded bg-purple-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          Run ▶
        </button>
      </div>
      <div ref={editorRef} className="h-full w-full" />
    </motion.div>
  )
}
