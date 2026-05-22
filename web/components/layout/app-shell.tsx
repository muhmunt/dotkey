"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isLoggedIn } from "@/lib/auth"
import { TopNav } from "./top-nav"
import { Sidebar } from "./sidebar"
import { CommandPalette } from "@/components/search/command-palette"
import { ShortcutsModal } from "@/components/shortcuts-modal"

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/login")
  }, [router])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return
      if (e.key === "?") {
        e.preventDefault()
        setShortcutsOpen(o => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav onShortcuts={() => setShortcutsOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
