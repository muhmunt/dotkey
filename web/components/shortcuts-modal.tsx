"use client"

import { useEffect } from "react"
import { Keyboard, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  onClose: () => void
}

interface Shortcut { keys: string[]; description: string; soon?: boolean }
interface Section { title: string; shortcuts: Shortcut[] }

const SECTIONS: Section[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open search" },
      { keys: ["?"], description: "Open keyboard shortcuts" },
      { keys: ["Esc"], description: "Close any overlay" },
    ],
  },
  {
    title: "Search",
    shortcuts: [
      { keys: ["↑", "↓"], description: "Navigate results" },
      { keys: ["Enter"], description: "Go to result" },
      { keys: ["Esc"], description: "Close search" },
    ],
  },
  {
    title: "Variable Table",
    shortcuts: [
      { keys: ["E"], description: "Edit selected row", soon: true },
      { keys: ["C"], description: "Copy value", soon: true },
      { keys: ["D"], description: "Delete selected row", soon: true },
    ],
  },
]

function Key({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border border-border bg-card text-xs font-mono text-muted-foreground">
      {label}
    </kbd>
  )
}

export function ShortcutsModal({ open, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Keyboard Shortcuts</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* shortcuts */}
        <div className="p-4 space-y-5">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {section.title}
              </p>
              <div className="space-y-1.5">
                {section.shortcuts.map(({ keys, description, soon }) => (
                  <div
                    key={description}
                    className={cn(
                      "flex items-center justify-between py-1",
                      soon && "opacity-40"
                    )}
                  >
                    <span className="text-sm text-muted-foreground">
                      {description}
                      {soon && (
                        <span className="ml-2 text-xs text-muted-foreground/60">
                          coming soon
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      {keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          <Key label={k} />
                          {i < keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Press <Key label="?" /> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  )
}
