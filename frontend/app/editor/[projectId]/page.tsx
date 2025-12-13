"use client"

import { useState } from "react"
import { CodeEditor } from "@/components/code-editor"
import { PreviewPane } from "@/components/preview-pane"
import { Collaborators } from "@/components/collaborators"

export default function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [htmlOutput, setHtmlOutput] = useState("")

  const [projectId, setProjectId] = useState("")

  useState(() => {
    params.then((p) => setProjectId(p.projectId))
  })

  const handleRunCode = (html: string) => {
    setHtmlOutput(html)
  }

  if (!projectId) return null

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Project: {projectId}</h1>
        <Collaborators projectId={projectId} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r">
          <CodeEditor projectId={projectId} onRunCode={handleRunCode} />
        </div>
        <div className="w-1/2">
          <PreviewPane projectId={projectId} htmlContent={htmlOutput} />
        </div>
      </div>
    </div>
  )
}
