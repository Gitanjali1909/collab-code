"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import { initializeSocket } from "@/lib/socket"

interface PreviewPaneProps {
  projectId: string
  htmlContent: string
}

export function PreviewPane({ projectId, htmlContent }: PreviewPaneProps) {
  const [previewContent, setPreviewContent] = useState("")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (htmlContent) {
      setPreviewContent(htmlContent)
    }
  }, [htmlContent])

  useEffect(() => {
    const socket = initializeSocket(projectId)

    // Listen for code changes
    if (socket) {
      socket.on("code-update", (code: string) => {
        setPreviewContent(code)
      })

      return () => {
        socket.off("code-update")
      }
    }
  }, [projectId])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex h-full w-full flex-col"
    >
      <div className="border-b px-4 py-2">
        <h2 className="text-sm font-medium">Preview</h2>
      </div>
      <iframe
        ref={iframeRef}
        title="Code Preview"
        srcDoc={previewContent}
        sandbox="allow-scripts"
        className="h-full w-full border-0 bg-white"
      />
    </motion.div>
  )
}
