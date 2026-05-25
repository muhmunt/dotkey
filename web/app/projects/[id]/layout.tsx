"use client"

import { useParams, usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { projects, environments } from "@/lib/api"
import type { Environment } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Plus, GitCompare, History, Users, Settings, Pencil, Check, X,
  Lock, Unlock, Activity, Plug, Key, Copy, Webhook,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

const DOT_COLORS = [
  "bg-emerald-500","bg-blue-500","bg-violet-500",
  "bg-orange-500","bg-pink-500","bg-cyan-500","bg-yellow-500",
]
function projectDotColor(name: string) {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return DOT_COLORS[hash % DOT_COLORS.length]
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()
  const qc = useQueryClient()

  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => projects.get(id) })
  const { data: envList = [] } = useQuery({ queryKey: ["environments", id], queryFn: () => environments.list(id) })

  const [newEnvName, setNewEnvName] = useState("")
  const [newEnvError, setNewEnvError] = useState("")
  const [showNewEnv, setShowNewEnv] = useState(false)
  const [renamingEnvId, setRenamingEnvId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [cloneSource, setCloneSource] = useState<Environment | null>(null)
  const [cloneTargetId, setCloneTargetId] = useState("")

  const createEnv = useMutation({
    mutationFn: () => environments.create(id, newEnvName.trim()),
    onSuccess: (env) => {
      qc.invalidateQueries({ queryKey: ["environments", id] })
      setNewEnvName(""); setNewEnvError(""); setShowNewEnv(false)
      window.location.href = `/projects/${id}/env/${env.id}`
    },
    onError: (err: any) => toast.error(err.message),
  })

  const cloneEnv = useMutation({
    mutationFn: ({ srcId, dstId }: { srcId: string; dstId: string }) =>
      environments.clone(id, srcId, dstId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["variables"] })
      setCloneSource(null); setCloneTargetId("")
      toast.success(`${res.synced} variable${res.synced !== 1 ? "s" : ""} copied`)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const renameEnv = useMutation({
    mutationFn: ({ envId, name }: { envId: string; name: string }) =>
      environments.rename(id, envId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["environments", id] })
      setRenamingEnvId(null)
      toast.success("Environment renamed")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const toggleLock = useMutation({
    mutationFn: ({ envId, locked }: { envId: string; locked: boolean }) =>
      environments.setLock(id, envId, locked),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["environments", id] }),
    onError: (err: any) => toast.error(err.message),
  })

  function isActive(path: string) { return pathname === path }
  function isEnvActive(envId: string) { return pathname.startsWith(`/projects/${id}/env/${envId}`) }

  const navLinks = [
    { href: `/projects/${id}/diff`,         icon: GitCompare, label: "Diff" },
    { href: `/projects/${id}/history`,       icon: History,    label: "History" },
    { href: `/projects/${id}/activity`,      icon: Activity,   label: "Activity" },
    { href: `/projects/${id}/members`,       icon: Users,      label: "Members" },
    { href: `/projects/${id}/tokens`,        icon: Key,        label: "Tokens" },
    { href: `/projects/${id}/webhooks`,      icon: Webhook,    label: "Webhooks" },
    { href: `/projects/${id}/integrations`,  icon: Plug,       label: "Integrations" },
    { href: `/projects/${id}/settings`,      icon: Settings,   label: "Settings" },
  ]

  return (
    <AppShell>
      <div className="flex h-full">
        {/* project sub-nav */}
        <div className="w-48 shrink-0 border-r border-border bg-card flex flex-col">
          <div className="px-3 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full shrink-0", projectDotColor(project?.name ?? ""))} />
              <p className="text-xs font-medium truncate">{project?.name ?? "…"}</p>
            </div>
            {project?.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5 pl-4">{project.description}</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {/* environments */}
            <div className="px-3 pt-2 pb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Envs
              </span>
              <button
                onClick={() => setShowNewEnv(v => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="New environment"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {showNewEnv && (
              <form
                onSubmit={e => {
                  e.preventDefault()
                  const name = newEnvName.trim()
                  if (!name) { setNewEnvError("Name is required"); return }
                  if (/[\s/]/.test(name)) { setNewEnvError("No spaces or slashes"); return }
                  setNewEnvError(""); createEnv.mutate()
                }}
                className="px-2 pb-1 space-y-1"
              >
                <div className="flex gap-1">
                  <Input value={newEnvName}
                    onChange={e => { setNewEnvName(e.target.value); newEnvError && setNewEnvError("") }}
                    placeholder="production" className={cn("h-6 text-xs bg-input border-border", newEnvError && "border-destructive")} autoFocus />
                  <Button type="submit" size="sm" className="h-6 text-xs px-2" disabled={createEnv.isPending}>+</Button>
                </div>
                {newEnvError && <p className="text-xs text-destructive px-0.5">{newEnvError}</p>}
              </form>
            )}

            {envList.map(env => (
              <div key={env.id} className="group relative">
                {renamingEnvId === env.id ? (
                  <form
                    onSubmit={e => { e.preventDefault(); renameEnv.mutate({ envId: env.id, name: renameValue.trim() }) }}
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    <Input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      className="h-6 text-xs bg-input border-border flex-1" autoFocus />
                    <button type="submit" className="text-primary hover:text-primary/80 shrink-0">
                      <Check className="h-3 w-3" />
                    </button>
                    <button type="button" onClick={() => setRenamingEnvId(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center">
                    <Link
                      href={`/projects/${id}/env/${env.id}`}
                      className={cn(
                        "flex items-center flex-1 px-3 py-1.5 text-xs transition-all min-w-0",
                        isEnvActive(env.id)
                          ? "text-foreground bg-accent/60 border-l-2 border-primary pl-[10px]"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                      )}
                    >
                      <span className="truncate flex-1">{env.name}</span>
                      {env.locked && <Lock className="h-2.5 w-2.5 text-muted-foreground ml-1 shrink-0" />}
                    </Link>
                    {/* hover actions */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center pr-1 shrink-0 transition-opacity gap-0.5">
                      <button
                        onClick={() => { setRenamingEnvId(env.id); setRenameValue(env.name) }}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                        title="Rename"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => { setCloneSource(env); setCloneTargetId("") }}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                        title="Clone to another environment"
                      >
                        <Copy className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => toggleLock.mutate({ envId: env.id, locked: !env.locked })}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                        title={env.locked ? "Unlock" : "Lock"}
                      >
                        {env.locked
                          ? <Unlock className="h-2.5 w-2.5" />
                          : <Lock className="h-2.5 w-2.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* project-level links */}
            <div className="mt-3 border-t border-border pt-2">
              {navLinks.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                    isActive(href)
                      ? "text-foreground bg-accent/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* main content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>

      {/* clone dialog */}
      <Dialog open={!!cloneSource} onOpenChange={open => { if (!open) { setCloneSource(null); setCloneTargetId("") } }}>
        <DialogContent className="sm:max-w-xs bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm">Clone environment</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Copy all variables from <span className="font-mono font-medium text-foreground">{cloneSource?.name}</span> into:
          </p>
          <select
            value={cloneTargetId}
            onChange={e => setCloneTargetId(e.target.value)}
            className="h-8 text-xs bg-input border border-border rounded px-2 text-foreground w-full"
          >
            <option value="">Select target environment…</option>
            {envList.filter(e => e.id !== cloneSource?.id).map(e => (
              <option key={e.id} value={e.id}>{e.name}{e.locked ? " (locked)" : ""}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Existing keys in the target will be overwritten.</p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setCloneSource(null); setCloneTargetId("") }}>
              Cancel
            </Button>
            <Button
              size="sm" className="h-7 text-xs"
              disabled={!cloneTargetId || cloneEnv.isPending}
              onClick={() => cloneSource && cloneEnv.mutate({ srcId: cloneSource.id, dstId: cloneTargetId })}
            >
              {cloneEnv.isPending ? "Copying…" : "Copy variables"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
