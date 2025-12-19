"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { initializeYjs, updateYjsLanguage, destroyYjsInstance } from "@/lib/yjs"
import { initializeSocket } from "@/lib/socket"

interface CodeEditorProps {
  projectId: string
  onRunCode: (html: string) => void
}

type Language = "html" | "css" | "javascript"

export function CodeEditor({ projectId, onRunCode }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<any>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const contentRef = useRef({
    html: "<!-- Write your HTML here -->\n<h1>Hello World</h1>\n",
    css: "/* Write your CSS here */\nbody {\n  font-family: sans-serif;\n  padding: 20px;\n}\n",
    javascript: "// Write your JavaScript here\nconsole.log('Hello World');\n",
  })

  const [currentLanguage, setCurrentLanguage] = useState<Language>("html")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")

  const generateHTML = () => {
    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<style>${contentRef.current.css}</style>
</head>
<body>
${contentRef.current.html}
<script>${contentRef.current.javascript}</script>
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
        body: JSON.stringify(contentRef.current),
      })
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      console.error("Failed to save:", error)
      setSaveStatus("idle")
    }
  }

  const switchLanguage = (lang: Language) => {
    if (!monacoRef.current) return

    const currentContent = monacoRef.current.getValue()
    contentRef.current[currentLanguage] = currentContent

    setCurrentLanguage(lang)

    const model = monacoRef.current.getModel()
    if (model) {
      const monaco = (window as any).monaco
      monaco.editor.setModelLanguage(model, lang === "javascript" ? "javascript" : lang)
      updateYjsLanguage(projectId, monacoRef.current, lang)

      const yjsValue = model.getValue()
      if (yjsValue) {
        contentRef.current[lang] = yjsValue
      } else {
        monacoRef.current.setValue(contentRef.current[lang])
      }
    }
  }

  useEffect(() => {
    let mounted = true

    const initEditor = async () => {
      if (!editorRef.current) return

      const monaco = await import("monaco-editor")
      ;(window as any).monaco = monaco

      if (!mounted || !editorRef.current) return

      const editor = monaco.editor.create(editorRef.current, {
        value: contentRef.current.html,
        language: "html",
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

      editor.onDidChangeModelContent(() => {
        const currentContent = editor.getValue()
        contentRef.current[currentLanguage] = currentContent

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(() => {
          generateHTML()
        }, 800)

        saveTimerRef.current = setTimeout(() => {
          saveToBackend()
        }, 2000)
      })

      try {
        const yjsSetup = initializeYjs(projectId, editor, currentLanguage)

        const model = editor.getModel()
        if (model && model.getValue() === "") {
          editor.setValue(contentRef.current[currentLanguage])
        }
      } catch (error) {
        console.log("Yjs not available - continuing in local mode")
      }

      const socket = initializeSocket(projectId)

      if (socket) {
        socket.on("cursor-update", (data: any) => {})

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
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      if (monacoRef.current) {
        monacoRef.current.dispose()
      }
      destroyYjsInstance(projectId)
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
          {(["html", "css", "javascript"] as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => switchLanguage(lang)}
              className={`rounded px-3 py-1 text-xs font-medium uppercase transition-colors ${
                currentLanguage === lang ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {lang === "javascript" ? "JS" : lang}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: saveStatus !== "idle" ? 1 : 0 }}
            className="text-xs text-gray-400"
          >
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved ✓"}
          </motion.span>

          <button
            onClick={generateHTML}
            className="flex items-center gap-2 rounded bg-purple-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            Run ▶
          </button>
        </div>
      </div>
      <div ref={editorRef} className="h-full w-full" />
    </motion.div>
  )
}
