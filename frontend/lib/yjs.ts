import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"

interface YjsSetup {
  doc: Y.Doc
  provider: WebsocketProvider | null
  text: Y.Text
}

const yjsInstances = new Map<string, YjsSetup>()

export async function initializeYjs(projectId: string, editor?: any): Promise<YjsSetup> {
  // Return existing instance if available
  if (yjsInstances.has(projectId)) {
    return yjsInstances.get(projectId)!
  }

  // Create a new Yjs document
  const doc = new Y.Doc()

  // Create a shared text type
  const text = doc.getText("monaco")

  let provider: WebsocketProvider | null = null

  if (process.env.NEXT_PUBLIC_YJS_SERVER_URL) {
    try {
      provider = new WebsocketProvider(process.env.NEXT_PUBLIC_YJS_SERVER_URL, projectId, doc, {
        connect: true,
        WebSocketPolyfill: undefined,
      })

      provider.on("status", (event: any) => {
        console.log("[v0] Yjs connection status:", event.status)
      })

      provider.on("connection-error", () => {
        console.log("[v0] Yjs server unavailable - running in local mode")
      })
    } catch (error) {
      console.log("[v0] Yjs initialization failed - running in local mode")
      provider = null
    }
  } else {
    console.log("[v0] Yjs server URL not configured - running in local mode")
  }

  // Bind Yjs text to Monaco editor if provided
  if (editor) {
    // Listen for remote changes
    text.observe((event) => {
      if (event.transaction.local) return

      const currentValue = editor.getValue()
      const yjsValue = text.toString()

      if (currentValue !== yjsValue) {
        const position = editor.getPosition()
        editor.setValue(yjsValue)
        if (position) {
          editor.setPosition(position)
        }
      }
    })

    // Listen for local changes
    editor.onDidChangeModelContent(() => {
      const editorValue = editor.getValue()
      const yjsValue = text.toString()

      if (editorValue !== yjsValue) {
        doc.transact(() => {
          text.delete(0, text.length)
          text.insert(0, editorValue)
        })
      }
    })
  }

  const setup: YjsSetup = { doc, provider, text }
  yjsInstances.set(projectId, setup)

  return setup
}

export function getYjsInstance(projectId: string): YjsSetup | undefined {
  return yjsInstances.get(projectId)
}

export function destroyYjsInstance(projectId: string): void {
  const instance = yjsInstances.get(projectId)
  if (instance) {
    if (instance.provider) {
      instance.provider.destroy()
    }
    instance.doc.destroy()
    yjsInstances.delete(projectId)
  }
}
