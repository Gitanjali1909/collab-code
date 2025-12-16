"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { CodeEditor } from "@/components/code-editor"
import { PreviewPane } from "@/components/preview-pane"
import { StatusBar } from "@/components/status-bar"

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()

  const [htmlOutput, setHtmlOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)

  const handleRunCode = (html: string) => {
    setIsRunning(true)
    setHtmlOutput(html)
    setTimeout(() => setIsRunning(false), 300)
  }

  return (
    <div className="flex h-screen w-full flex-col">
      <StatusBar projectId={projectId} />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r">
          <CodeEditor
            projectId={projectId}
            onRunCode={handleRunCode}
          />
        </div>

        <div className="w-1/2">
          <PreviewPane
            projectId={projectId}
            htmlContent={htmlOutput}
            isRunning={isRunning}
          />
        </div>
      </div>
    </div>
  )
}
