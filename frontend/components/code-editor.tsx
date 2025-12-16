"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { initializeYjs } from "@/lib/yjs"
import { initializeSocket } from "@/lib/socket"

interface CodeEditorProps {
  projectId: string
  onRunCode: (html: string) => void
}

type Language = "html" | "css" | "javascript" | "python"

export function CodeEditor({ projectId, onRunCode }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<any>(null)

  // ✅ browser-safe timers
  const debounceTimerRef = useRef<number | null>(null)
  const saveTimerRef = useRef<number | null>(null)

  const [currentLanguage, setCurrentLanguage] = useState<Language>("html")
  const [content, setContent] = useState<Record<Language, string>>({
    html: "<!-- Write your HTML here -->\n<h1>Hello World</h1>\n",
    css: "/* Write your CSS here */\nbody {\n  font-family: sans-serif;\n  padding: 20px;\n}\n",
    javascript: "// Write your JavaScript here\nconsole.log('Hello World');\n",
    python: "# Write your Python here\nprint('Hello World')\n",
  })

  const [saveStatus, setSaveStatus] =
    useState<"idle" | "saving" | "saved">("idle")

  const generateHTML = () => {
    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<style>${content.css}</style>
</head>
<body>
${content.html}
<script>${content.javascript}</script>
</body>
</html>`

    onRunCode(fullHTML)
  }

  const saveToBackend = async () => {
    setSaveStatus("saving")
    try {
      await fetch(`/api/projects/${projectId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      })
      setSaveStatus("saved")
      window.setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      console.error("Failed to save:", error)
      setSaveStatus("idle")
    }
  }

  const switchLanguage = (lang: Language) => {
    const editor = monacoRef.current
    if (!editor) return

    // save current buffer
    setContent((prev) => ({
      ...prev,
      [currentLanguage]: editor.getValue(),
    }))

    setCurrentLanguage(lang)

    const model = editor.getModel()
    if (model) {
      const monaco = (window as any).monaco

      // ✅ Monaco language mapping (Python was broken before)
      const monacoLang =
        lang === "javascript"
          ? "javascript"
          : lang === "python"
          ? "python"
          : lang

      monaco.editor.setModelLanguage(model, monacoLang)
      editor.setValue(content[lang])
    }
  }

  useEffect(() => {
    let mounted = true

    const initEditor = async () => {
      if (!editorRef.current) return

      const monaco = await import("monaco-editor")
      ;(window as any).monaco = monaco

      if (!mounted) return

      const editor = monaco.editor.create(editorRef.current, {
        value: content.html,
        language: "html",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
      })

      monacoRef.current = editor

      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        generateHTML
      )

      editor.onDidChangeModelContent(() => {
        const value = editor.getValue()

        setContent((prev) => ({
          ...prev,
          [currentLanguage]: value,
        }))

        if (debounceTimerRef.current)
          window.clearTimeout(debounceTimerRef.current)
        if (saveTimerRef.current)
          window.clearTimeout(saveTimerRef.current)

        debounceTimerRef.current = window.setTimeout(generateHTML, 800)
        saveTimerRef.current = window.setTimeout(saveToBackend, 2000)
      })

      try {
        await initializeYjs(projectId, editor)
      } catch {
        // silent fallback
      }

      const socket = initializeSocket(projectId)
      if (socket) {
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
      if (debounceTimerRef.current)
        window.clearTimeout(debounceTimerRef.current)
      if (saveTimerRef.current)
        window.clearTimeout(saveTimerRef.current)
      monacoRef.current?.dispose()
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
        <div className="flex gap-1 rounded-md bg-gray-800 p-1">
          {(["html", "css", "javascript", "python"] as Language[]).map(
            (lang) => (
              <button
                key={lang}
                onClick={() => switchLanguage(lang)}
                className={`rounded px-3 py-1 text-xs font-medium uppercase ${
                  currentLanguage === lang
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {lang === "javascript" ? "JS" : lang}
              </button>
            )
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" && "Saved ✓"}
          </span>

          <button
            onClick={generateHTML}
            className="rounded bg-purple-600 px-4 py-1.5 text-sm text-white hover:bg-purple-700"
          >
            Run ▶
          </button>
        </div>
      </div>

      <div ref={editorRef} className="h-full w-full" />
    </motion.div>
  )
}
