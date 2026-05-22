"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { environments, history } from "@/lib/api"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatDate, shortId } from "@/lib/utils"
import { History, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import type { Environment } from "@/lib/api"

const actionColor: Record<string, string> = {
  created:     "text-emerald-400",
  updated:     "text-yellow-400",
  deleted:     "text-red-400",
  rolled_back: "text-blue-400",
}

export default function HistoryPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: envList = [] } = useQuery({ queryKey: ["environments", projectId], queryFn: () => environments.list(projectId) })
  const [selectedEnv, setSelectedEnv] = useState<Environment | null>(null)

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["history", projectId, selectedEnv?.id],
    queryFn: () => history.list(projectId, selectedEnv!.id),
    enabled: !!selectedEnv,
  })

  const rollback = useMutation({
    mutationFn: (versionId: string) => history.rollback(projectId, selectedEnv!.id, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["variables", projectId, selectedEnv?.id] })
      qc.invalidateQueries({ queryKey: ["history", projectId, selectedEnv?.id] })
      toast.success("Rolled back successfully")
    },
    onError: (err: any) => toast.error(err.message),
  })

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <History className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-medium">History</h1>
      </div>

      <div className="mb-4">
        <select
          value={selectedEnv?.id ?? ""}
          onChange={e => {
            const env = envList.find(ev => ev.id === e.target.value) ?? null
            setSelectedEnv(env)
          }}
          className="h-8 text-xs bg-input border border-border rounded-md px-2 text-foreground"
        >
          <option value="">Select environment…</option>
          {envList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}

      {selectedEnv && !isLoading && versions.length === 0 && (
        <p className="text-xs text-muted-foreground">No history yet for {selectedEnv.name}.</p>
      )}

      {versions.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-card/50">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">VERSION</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">KEY</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">ACTION</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium hidden sm:table-cell">BY</th>
                <th className="text-right px-3 py-2 text-muted-foreground font-medium hidden sm:table-cell">WHEN</th>
                <th className="px-3 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v, i) => (
                <tr key={v.id} className={`${i > 0 ? "border-t border-border" : ""} hover:bg-accent/30 transition-colors`}>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{shortId(v.id)}</td>
                  <td className="px-3 py-2.5 font-mono font-medium">{v.key}</td>
                  <td className={`px-3 py-2.5 font-mono ${actionColor[v.action] ?? ""}`}>{v.action}</td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{v.actor?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-right hidden sm:table-cell">{formatDate(v.created_at)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {v.action !== "deleted" && (
                      <button
                        onClick={() => { if (confirm(`Roll back ${v.key} to this version?`)) rollback.mutate(v.id) }}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors ml-auto"
                        title="Rollback"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
