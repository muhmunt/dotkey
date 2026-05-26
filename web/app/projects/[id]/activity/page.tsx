"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { activity, environments, history } from "@/lib/api"
import { useState, useEffect } from "react"
import { formatDate, shortId, cn } from "@/lib/utils"
import { Activity, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { ActivityEntry } from "@/lib/api"

const PAGE_SIZE = 50
const EMPTY_PAGE: ActivityEntry[] = []

const ACTION_STYLE: Record<string, string> = {
  created:     "text-emerald-400 bg-emerald-400/10",
  updated:     "text-yellow-400 bg-yellow-400/10",
  deleted:     "text-red-400 bg-red-400/10",
  rolled_back: "text-blue-400 bg-blue-400/10",
}

function groupByDate(entries: ActivityEntry[]) {
  const groups: Record<string, ActivityEntry[]> = {}
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  entries.forEach(e => {
    const d = new Date(e.created_at)
    const key = d.toDateString() === today
      ? "Today"
      : d.toDateString() === yesterday
      ? "Yesterday"
      : d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })
  return groups
}

export default function ActivityPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [envFilter, setEnvFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [offset, setOffset] = useState(0)
  const [allEntries, setAllEntries] = useState<ActivityEntry[]>([])

  const { data: envList = [] } = useQuery({
    queryKey: ["environments", projectId],
    queryFn: () => environments.list(projectId),
  })

  const { data: page = EMPTY_PAGE, isLoading, isFetching } = useQuery({
    queryKey: ["activity", projectId, envFilter, actionFilter, offset],
    queryFn: () => activity.list(projectId, envFilter || undefined, actionFilter || undefined, offset, PAGE_SIZE),
  })

  const hasMore = page.length === PAGE_SIZE

  useEffect(() => {
    if (offset === 0) {
      setAllEntries(page)
    } else {
      setAllEntries(prev => [...prev, ...page])
    }
  }, [page, offset])

  function resetFilters() {
    setOffset(0)
    setAllEntries([])
  }

  const entries = allEntries

  const rollback = useMutation({
    mutationFn: ({ envId, versionId }: { envId: string; versionId: string }) =>
      history.rollback(projectId, envId, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity", projectId] })
      qc.invalidateQueries({ queryKey: ["variables", projectId] })
      toast.success("Rolled back successfully")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const groups = groupByDate(entries)

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-medium">Activity</h1>
        <span className="text-xs text-muted-foreground">({entries.length})</span>
      </div>

      {/* filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <select
          value={envFilter}
          onChange={e => { setEnvFilter(e.target.value); resetFilters() }}
          className="h-7 text-xs bg-input border border-border rounded px-2 text-foreground"
        >
          <option value="">All environments</option>
          {envList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); resetFilters() }}
          className="h-7 text-xs bg-input border border-border rounded px-2 text-foreground"
        >
          <option value="">All actions</option>
          {["created", "updated", "deleted", "rolled_back"].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {!isLoading && entries.length === 0 && (
        <p className="text-xs text-muted-foreground">No activity yet.</p>
      )}


      {isLoading && offset === 0 && <p className="text-xs text-muted-foreground">Loading…</p>}

      {Object.entries(groups).map(([date, items]) => (
        <div key={date} className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {date}
          </p>
          <div className="border border-border rounded-md overflow-hidden">
            {items.map((entry, i) => (
              <div
                key={entry.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors",
                  i > 0 && "border-t border-border"
                )}
              >
                {/* actor avatar */}
                <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-primary">
                    {(entry.actor_name || "?")[0].toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium">{entry.actor_name}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-mono",
                    ACTION_STYLE[entry.action] ?? "text-muted-foreground bg-muted"
                  )}>
                    {entry.action}
                  </span>
                  <span className="text-xs font-mono font-medium">{entry.key}</span>
                  <span className="text-xs text-muted-foreground">in</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-border/50 font-mono">
                    {entry.environment_name}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
                  {entry.action !== "deleted" && (
                    <button
                      onClick={() => {
                        if (confirm(`Roll back ${entry.key} to its state before this ${entry.action}?`)) {
                          rollback.mutate({ envId: entry.environment_id, versionId: entry.id })
                        }
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Rollback"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="mt-2 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-border"
            onClick={() => setOffset(o => o + PAGE_SIZE)}
            disabled={isFetching}
          >
            {isFetching ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  )
}
