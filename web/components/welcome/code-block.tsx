"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CodeBlockProps {
  code: string
  prompt?: boolean   // show $ prefix
  className?: string
}

export function CodeBlock({ code, prompt = true, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("group relative terminal flex items-center px-4 py-3", className)}>
      <span className="font-mono text-sm select-none text-muted-foreground mr-2">
        {prompt ? "$" : ""}
      </span>
      <span className="font-mono text-sm text-foreground flex-1 pr-8">{code}</span>
      <button
        onClick={copy}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-foreground"
        title="Copy"
      >
        {copied
          ? <Check className="h-3.5 w-3.5 text-primary" />
          : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}
