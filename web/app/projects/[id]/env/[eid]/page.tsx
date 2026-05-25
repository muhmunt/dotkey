"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { variables, environments, auth } from "@/lib/api"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDate, formatSeconds } from "@/lib/utils"
import { useReveal } from "@/context/reveal-context"
import { RevealLockModal } from "@/components/reveal-lock-modal"
import { Eye, EyeOff, Copy, Pencil, Trash2, Plus, Upload, Download, Check, X, Lock, Unlock, Timer, Square, CheckSquare } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Variable } from "@/lib/api"

export default function EnvPage() {
  const { id: projectId, eid: envId } = useParams<{ id: string; eid: string }>()
  const qc = useQueryClient()
  const { revealToken, isUnlocked, secondsLeft, lock } = useReveal()

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: auth.me })
  const { data: envList = [] } = useQuery({
    queryKey: ["environments", projectId],
    queryFn: () => environments.list(projectId),
  })
  const currentEnv = envList.find(e => e.id === envId)
  const isLocked = currentEnv?.locked ?? false

  const { data: vars = [], isLoading } = useQuery({
    queryKey: ["variables", projectId, envId],
    queryFn: () => variables.list(projectId, envId),
  })

  const [revealed, setRevealed] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [keyError, setKeyError] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [showRevealModal, setShowRevealModal] = useState(false)
  const [pendingRevealAction, setPendingRevealAction] = useState<(() => void) | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Require 2FA unlock before any export action
  function withReveal(action: () => void) {
    if (!me?.totp_enabled || isUnlocked) {
      action()
      return
    }
    setPendingRevealAction(() => action)
    setShowRevealModal(true)
  }

  async function fetchAllValues(): Promise<Record<string, string>> {
    const content = await variables.export(projectId, envId, revealToken ?? undefined)
    const map: Record<string, string> = {}
    content.split("\n").forEach(line => {
      const i = line.indexOf("=")
      if (i > 0) map[line.slice(0, i)] = line.slice(i + 1)
    })
    return map
  }

  async function toggleReveal(v: Variable) {
    if (revealed[v.id] !== undefined) {
      setRevealed(r => { const n = { ...r }; delete n[v.id]; return n })
      return
    }
    withReveal(async () => {
      try {
        const map = await fetchAllValues()
        setRevealed(r => ({ ...r, [v.id]: map[v.key] ?? "" }))
      } catch (err: any) {
        if (err.message === "reveal_locked" || err.message === "reveal_expired") {
          setShowRevealModal(true)
        } else {
          toast.error(err.message)
        }
      }
    })
  }

  async function copyValue(v: Variable) {
    withReveal(async () => {
      try {
        const map = await fetchAllValues()
        await navigator.clipboard.writeText(map[v.key] ?? "")
        toast.success(`Copied ${v.key}`)
      } catch (err: any) { toast.error(err.message) }
    })
  }

  function validateKey(key: string): string {
    if (!key.trim()) return "Key is required"
    if (/\s/.test(key)) return "Key cannot contain spaces"
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key.trim())) return "Must start with a letter or underscore, letters/numbers/underscores only"
    if (vars.some(v => v.key === key.trim())) return `"${key.trim()}" already exists in this environment`
    return ""
  }

  const createVar = useMutation({
    mutationFn: () => variables.create(projectId, envId, newKey.trim(), newValue),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variables", projectId, envId] })
      setNewKey(""); setNewValue(""); setShowAdd(false); setKeyError("")
      toast.success("Variable added")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await variables.delete(projectId, envId, id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variables", projectId, envId] })
      setSelected(new Set()); setRevealed({})
      toast.success("Deleted selected variables")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const updateVar = useMutation({
    mutationFn: (v: Variable) => variables.update(projectId, envId, v.id, editValue),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variables", projectId, envId] })
      setRevealed({}); setEditing(null)
      toast.success("Variable updated")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteVar = useMutation({
    mutationFn: (v: Variable) => variables.delete(projectId, envId, v.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variables", projectId, envId] })
      setRevealed({})
      toast.success("Variable deleted")
    },
    onError: (err: any) => toast.error(err.message),
  })

  function handlePull() {
    withReveal(async () => {
      try {
        const content = await variables.export(projectId, envId, revealToken ?? undefined)
        const blob = new Blob([content], { type: "text/plain" })
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = ".env"; a.click()
        toast.success(".env downloaded")
      } catch (err: any) { toast.error(err.message) }
    })
  }

  async function handlePush(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const content = await file.text()
    try {
      const res = await variables.import(projectId, envId, content)
      qc.invalidateQueries({ queryKey: ["variables", projectId, envId] })
      setRevealed({})
      toast.success(`${res.synced} variables synced`)
    } catch (err: any) { toast.error(err.message) }
    e.target.value = ""
  }

  const filtered = vars.filter(v => v.key.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-5">
      {/* environment lock banner */}
      {isLocked && (
        <div className="flex items-center gap-2.5 mb-4 px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-xs">
          <Lock className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
          <span className="text-yellow-400 font-medium">This environment is locked.</span>
          <span className="text-muted-foreground">All edits are disabled. Unlock it from the environment menu in the sidebar.</span>
        </div>
      )}

      {/* reveal lock modal */}
      {showRevealModal && (
        <RevealLockModal
          onClose={() => { setShowRevealModal(false); setPendingRevealAction(null) }}
          onUnlocked={() => {
            setShowRevealModal(false)
            if (pendingRevealAction) {
              pendingRevealAction()
              setPendingRevealAction(null)
            }
          }}
        />
      )}

      {/* toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search keys…"
          className="h-7 text-xs w-48 bg-input border-border"
        />
        <span className="text-xs text-muted-foreground ml-1">{vars.length} variables</span>

        {/* reveal session indicator */}
        {me?.totp_enabled && (
          <div className="flex items-center gap-1.5 ml-2">
            {isUnlocked ? (
              <button
                onClick={lock}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                title="Lock secrets"
              >
                <Unlock className="h-3 w-3" />
                <Timer className="h-3 w-3" />
                <span className="font-mono">{formatSeconds(secondsLeft)}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowRevealModal(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Unlock secrets"
              >
                <Lock className="h-3 w-3" />
                <span>Locked</span>
              </button>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-border" onClick={handlePull}>
            <Download className="h-3 w-3" /> Pull
          </Button>
          {!isLocked && (
            <>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-border" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3 w-3" /> Push
              </Button>
              <input ref={fileRef} type="file" accept=".env,text/plain" className="hidden" onChange={handlePush} />
              <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowAdd(v => !v)}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </>
          )}
        </div>
      </div>

      {/* add row */}
      {showAdd && (
        <form onSubmit={e => {
          e.preventDefault()
          const err = validateKey(newKey)
          if (err) { setKeyError(err); return }
          setKeyError("")
          createVar.mutate()
        }} className="mb-3 p-2.5 border border-primary/30 rounded-md bg-card space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-48 space-y-1">
              <Input value={newKey}
                onChange={e => { setNewKey(e.target.value); keyError && setKeyError("") }}
                placeholder="VARIABLE_KEY" className={cn("h-7 text-xs font-mono bg-input border-border", keyError && "border-destructive")} autoFocus />
            </div>
            <Input value={newValue} onChange={e => setNewValue(e.target.value)}
              placeholder="value" className="h-7 text-xs font-mono flex-1 bg-input border-border" />
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={createVar.isPending}>
              {createVar.isPending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowAdd(false); setKeyError("") }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          {keyError && <p className="text-xs text-destructive pl-0.5">{keyError}</p>}
        </form>
      )}

      {isLoading && <p className="text-xs text-muted-foreground py-4">Loading…</p>}

      {!isLoading && filtered.length === 0 && (
        <p className="text-xs text-muted-foreground py-4">
          {search ? "No keys match your search." : "No variables yet."}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-card/50">
                {!isLocked && (
                  <th className="px-3 py-2 w-8">
                    <button
                      onClick={() => {
                        if (selected.size === filtered.length) setSelected(new Set())
                        else setSelected(new Set(filtered.map(v => v.id)))
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {selected.size === filtered.length && filtered.length > 0
                        ? <CheckSquare className="h-3.5 w-3.5" />
                        : <Square className="h-3.5 w-3.5" />}
                    </button>
                  </th>
                )}
                <th className="text-left px-3 py-2 text-muted-foreground font-medium w-1/3">KEY</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">VALUE</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium w-32 hidden sm:table-cell">UPDATED</th>
                <th className="px-3 py-2 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={v.id} className={cn(i > 0 && "border-t border-border", "hover:bg-accent/30 transition-colors", selected.has(v.id) && "bg-primary/5")}>
                  {!isLocked && (
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => setSelected(prev => {
                          const next = new Set(prev)
                          next.has(v.id) ? next.delete(v.id) : next.add(v.id)
                          return next
                        })}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {selected.has(v.id) ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  )}
                  <td className="px-3 py-2.5 font-mono font-medium">{v.key}</td>

                  <td className="px-3 py-2.5 font-mono">
                    {editing === v.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input value={editValue} onChange={e => setEditValue(e.target.value)}
                          className="h-6 text-xs bg-input border-border" autoFocus />
                        <button onClick={() => updateVar.mutate(v)} className="text-primary hover:text-primary/80">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {revealed[v.id] !== undefined
                          ? <span className="text-foreground break-all">{revealed[v.id]}</span>
                          : "••••••••••••"}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell text-right">
                    {formatDate(v.updated_at)}
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => !isLocked && toggleReveal(v)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Reveal">
                        {revealed[v.id] !== undefined ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => copyValue(v)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Copy">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {!isLocked && (
                        <>
                          <button
                            onClick={() => { setEditing(v.id); setEditValue(revealed[v.id] ?? "") }}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete ${v.key}?`)) deleteVar.mutate(v) }}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-card shadow-xl shadow-black/30 z-50">
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          <div className="w-px h-4 bg-border" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={bulkDelete.isPending}
            onClick={() => {
              if (confirm(`Delete ${selected.size} variable${selected.size > 1 ? "s" : ""}?`)) {
                bulkDelete.mutate([...selected])
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {bulkDelete.isPending ? "Deleting…" : "Delete selected"}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        </div>
      )}
    </div>
  )
}
