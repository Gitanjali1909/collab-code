import { CodeEditor } from "@/components/code-editor"
import { PreviewPane } from "@/components/preview-pane"
import { Collaborators } from "@/components/collaborators"

export default async function EditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-lg font-semibold">Project: {projectId}</h1>
        <Collaborators projectId={projectId} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r">
          <CodeEditor projectId={projectId} />
        </div>
        <div className="w-1/2">
          <PreviewPane projectId={projectId} />
        </div>
      </div>
    </div>
  )
}
