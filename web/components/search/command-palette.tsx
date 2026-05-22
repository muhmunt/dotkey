"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { globalSearch } from "@/lib/api"
import { getToken } from "@/lib/auth"
import { Search, FolderOpen, Key, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SearchResult } from "@/lib/api"

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        if (!getToken()) return // not logged in
        setOpen(o => !o)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery("")
      setResults([])
      setSelected(0)
    }
  }, [open])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return }
    setLoading(true)
    try {
      const data = await globalSearch.query(q)
      setResults(data)
      setSelected(0)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 200)
  }

  function navigate(result: SearchResult) {
    setOpen(false)
    if (result.type === "project") {
      router.push(`/projects/${result.id}`)
    } else {
      router.push(`/projects/${result.project_id}/env/${result.environment_id}`)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === "Enter" && results[selected]) {
      navigate(results[selected])
    }
  }

  const projectResults = results.filter(r => r.type === "project")
  const variableResults = results.filter(r => r.type === "variable")

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* palette */}
      <div
        className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          {loading
            ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
            : <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={onKeyDown}
            placeholder="Search projects and variables…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono shrink-0">
            Esc
          </kbd>
        </div>

        {/* results */}
        <div className="max-h-80 overflow-y-auto">
          {query.length === 0 && (
            <p className="text-xs text-muted-foreground px-4 py-6 text-center">
              Start typing to search…
            </p>
          )}

          {query.length > 0 && results.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground px-4 py-6 text-center">
              No results for &quot;{query}&quot;
            </p>
          )}

          {projectResults.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1">
                Projects
              </p>
              {projectResults.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => navigate(r)}
                  onMouseEnter={() => setSelected(i)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    selected === i ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm">{r.name}</span>
                </button>
              ))}
            </div>
          )}

          {variableResults.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-1">
                Variables
              </p>
              {variableResults.map((r, i) => {
                const idx = projectResults.length + i
                return (
                  <button
                    key={r.id}
                    onClick={() => navigate(r)}
                    onMouseEnter={() => setSelected(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      selected === idx ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-mono flex-1 truncate">{r.key}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {r.environment_name} · {r.project_name}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">Enter</kbd> select</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
