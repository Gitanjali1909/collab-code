"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { initializeYjs, destroyYjsInstance } from "@/lib/yjs"
import { initializeSocket } from "@/lib/socket"

interface CodeEditorProps {
  projectId: string
  onRunCode: (output: string, type: "html" | "python") => void
}

type Language = "html" | "css" | "javascript" | "python"

export function CodeEditor({ projectId, onRunCode }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const monacoRef = useRef<any>(null)
  const pyodideRef = useRef<any>(null)

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const contentRef = useRef({
    html: "<h1>Hello World</h1>\n",
    css: "body { font-family: sans-serif; padding: 20px; }\n",
    javascript: "console.log('Hello World');\n",
    python: "print('Hello from Python')\n",
  })

  const [currentLanguage, setCurrentLanguage] = useState<Language>("html")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")

  /* -------------------- RUN CODE -------------------- */

  const runCode = async () => {
    if (!monacoRef.current) return
    contentRef.current[currentLanguage] = monacoRef.current.getValue()

    if (currentLanguage === "python") {
      await runPython()
      return
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
<style>${contentRef.current.css}</style>
</head>
<body>
${contentRef.current.html}
<script>${contentRef.current.javascript}</script>
</body>
</html>
`
    onRunCode(html, "html")
  }

  const runPython = async () => {
    if (!pyodideRef.current) {
      const pyodide = await (window as any).loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
      })
      pyodideRef.current = pyodide
    }

    try {
      const result = await pyodideRef.current.runPythonAsync(
        contentRef.current.python
      )
      onRunCode(String(result ?? ""), "python")
    } catch (err: any) {
      onRunCode(err.toString(), "python")
    }
  }

  /* -------------------- SAVE -------------------- */

  const saveToBackend = async () => {
    setSaveStatus("saving")
    await fetch(`/api/projects/${projectId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contentRef.current),
    })
    setSaveStatus("saved")
    setTimeout(() => setSaveStatus("idle"), 1500)
  }

  /* -------------------- SWITCH LANGUAGE -------------------- */

  const switchLanguage = (lang: Language) => {
    if (!monacoRef.current) return
    contentRef.current[currentLanguage] = monacoRef.current.getValue()
    setCurrentLanguage(lang)

    const monaco = (window as any).monaco
    const model = monacoRef.current.getModel()

    const map: Record<Language, string> = {
      html: "html",
      css: "css",
      javascript: "javascript",
      python: "python",
    }

    monaco.editor.setModelLanguage(model, map[lang])
    monacoRef.current.setValue(contentRef.current[lang])
  }

  /* -------------------- INIT -------------------- */

  useEffect(() => {
    let mounted = true

    const init = async () => {
      if (!editorRef.current) return

      const monaco = await import("monaco-editor")
      ;(window as any).monaco = monaco

      if (!mounted) return

      const editor = monaco.editor.create(editorRef.current, {
        value: contentRef.current.html,
        language: "html",
        theme: "vs-dark",
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: false },
      })

      monacoRef.current = editor

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runCode)

      editor.onDidChangeModelContent(() => {
        clearTimeout(debounceTimerRef.current!)
        clearTimeout(saveTimerRef.current!)

        debounceTimerRef.current = setTimeout(runCode, 800)
        saveTimerRef.current = setTimeout(saveToBackend, 2000)
      })

      initializeYjs(projectId, editor)
      initializeSocket(projectId)
    }

    init()

    return () => {
      mounted = false
      monacoRef.current?.dispose()
      destroyYjsInstance(projectId)
    }
  }, [projectId])

  /* -------------------- UI -------------------- */

  return (
    <motion.div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex gap-1 rounded bg-gray-800 p-1">
          {(["html", "css", "javascript", "python"] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => switchLanguage(l)}
              className={`px-3 py-1 text-xs uppercase ${
                currentLanguage === l ? "bg-purple-600 text-white" : "text-gray-400"
              }`}
            >
              {l === "javascript" ? "JS" : l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved ✓"}
          </span>

          <button
            onClick={runCode}
            className="rounded bg-purple-600 px-4 py-1.5 text-sm text-white"
          >
            Run ▶
          </button>
        </div>
      </div>

      <div ref={editorRef} className="flex-1" />
    </motion.div>
  )
}
