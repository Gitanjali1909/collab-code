import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"
import { MonacoBinding } from "y-monaco"
import type * as Monaco from "monaco-editor"

interface YjsSetup {
  doc: Y.Doc
  provider: WebsocketProvider | null
  binding: MonacoBinding | null
  awareness: WebsocketProvider["awareness"] | null
}

const yjsInstances = new Map<string, YjsSetup>()

function generateUserColor(): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
    "#F8B739",
    "#52B788",
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

function generateUserName(): string {
  const adjectives = ["Quick", "Bright", "Swift", "Bold", "Smart", "Clever"]
  const animals = ["Fox", "Eagle", "Wolf", "Tiger", "Hawk", "Lion"]
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${
    animals[Math.floor(Math.random() * animals.length)]
  }`
}

export function initializeYjs(
  projectId: string,
  editor: Monaco.editor.IStandaloneCodeEditor,
  language: string,
): YjsSetup {
  // Reuse existing instance (hot reload / editor remount)
  if (yjsInstances.has(projectId)) {
    const existing = yjsInstances.get(projectId)!

    if (existing.binding) {
      existing.binding.destroy()
    }

    const model = editor.getModel()
    if (model) {
      const ytext = existing.doc.getText(language)
      existing.binding = new MonacoBinding(
        ytext,
        model,
        new Set([editor]),
        existing.awareness || undefined,
      )
    }

    return existing
  }

  const doc = new Y.Doc()
  let provider: WebsocketProvider | null = null
  let awareness: WebsocketProvider["awareness"] | null = null

  if (process.env.NEXT_PUBLIC_YJS_SERVER_URL) {
    provider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_YJS_SERVER_URL,
      projectId,
      doc,
      { connect: true },
    )

    awareness = provider.awareness

    awareness.setLocalStateField("user", {
      name: generateUserName(),
      color: generateUserColor(),
    })

    provider.on("status", (event: { status: string }) => {
      console.log("Yjs status:", event.status)
    })

    provider.on("connection-error", (event: Event) => {
      console.warn("Yjs connection error — offline mode", event.type)
    })
  }

  const model = editor.getModel()
  let binding: MonacoBinding | null = null

  if (model) {
    const ytext = doc.getText(language)
    binding = new MonacoBinding(
      ytext,
      model,
      new Set([editor]),
      awareness || undefined,
    )
  }

  const setup: YjsSetup = {
    doc,
    provider,
    binding,
    awareness,
  }

  yjsInstances.set(projectId, setup)
  return setup
}

export function updateYjsLanguage(
  projectId: string,
  editor: Monaco.editor.IStandaloneCodeEditor,
  language: string,
): void {
  const instance = yjsInstances.get(projectId)
  if (!instance) return

  if (instance.binding) {
    instance.binding.destroy()
  }

  const model = editor.getModel()
  if (model) {
    const ytext = instance.doc.getText(language)
    instance.binding = new MonacoBinding(
      ytext,
      model,
      new Set([editor]),
      instance.awareness || undefined,
    )
  }
}

export function getYjsInstance(projectId: string): YjsSetup | undefined {
  return yjsInstances.get(projectId)
}

export function destroyYjsInstance(projectId: string): void {
  const instance = yjsInstances.get(projectId)
  if (!instance) return

  instance.binding?.destroy()
  instance.provider?.destroy()
  instance.doc.destroy()

  yjsInstances.delete(projectId)
}
