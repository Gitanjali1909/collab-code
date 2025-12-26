import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"
import { MonacoBinding } from "y-monaco"
import type * as Monaco from "monaco-editor"

interface YjsSetup {
  ydoc: Y.Doc
  provider: WebsocketProvider
  binding: MonacoBinding | null
}

const yjsInstances = new Map<string, YjsSetup>()

export function initializeYjs(projectId: string, editor: Monaco.editor.IStandaloneCodeEditor): YjsSetup {
  if (yjsInstances.has(projectId)) {
    const existing = yjsInstances.get(projectId)!

    if (existing.binding) {
      existing.binding.destroy()
    }

    const model = editor.getModel()
    if (model) {
      const ytext = existing.ydoc.getText("monaco")
      existing.binding = new MonacoBinding(ytext, model, new Set([editor]), existing.provider.awareness)
    }

    return existing
  }

  const ydoc = new Y.Doc()
  const provider = new WebsocketProvider("ws://localhost:1234", projectId, ydoc)

  const ytext = ydoc.getText("monaco")

  const model = editor.getModel()
  let binding: MonacoBinding | null = null

  if (model) {
    binding = new MonacoBinding(ytext, model, new Set([editor]), provider.awareness)
  }

  const setup: YjsSetup = {
    ydoc,
    provider,
    binding,
  }

  yjsInstances.set(projectId, setup)

  return setup
}

export function getYjsInstance(projectId: string): YjsSetup | undefined {
  return yjsInstances.get(projectId)
}

export function destroyYjsInstance(projectId: string): void {
  const instance = yjsInstances.get(projectId)
  if (instance) {
    if (instance.binding) {
      instance.binding.destroy()
    }
    instance.provider.destroy()
    instance.ydoc.destroy()
    yjsInstances.delete(projectId)
  }
}
