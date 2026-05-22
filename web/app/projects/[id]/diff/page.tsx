"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { environments, variables } from "@/lib/api"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight, GitCompare } from "lucide-react"
import { toast } from "sonner"
import type { DiffEntry } from "@/lib/api"

const statusLabel: Record<string, { label: string; color: string }> = {
  same:         { label: "✓ same",          color: "text-muted-foreground" },
  changed:      { label: "~ changed",       color: "text-yellow-400" },
  missing_in_b: { label: "+ missing in B",  color: "text-red-400" },
  missing_in_a: { label: "+ missing in A",  color: "text-emerald-400" },
}

export default function DiffPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { data: envList = [] } = useQuery({ queryKey: ["environments", projectId], queryFn: () => environments.list(projectId) })

  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [diff, setDiff] = useState<DiffEntry[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function runDiff() {
    if (!fromId || !toId) return
    setLoading(true)
    try {
      const result = await variables.diff(projectId, fromId, toId)
      setDiff(result)
    } catch (err: any) { toast.error(err.message) } finally { setLoading(false) }
  }

  const fromName = envList.find(e => e.id === fromId)?.name ?? ""
  const toName   = envList.find(e => e.id === toId)?.name ?? ""

  const counts = diff ? {
    same:    diff.filter(d => d.status === "same").length,
    changed: diff.filter(d => d.status === "changed").length,
    missing: diff.filter(d => d.status !== "same").length,
  } : null

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <GitCompare className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-medium">Diff</h1>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <select value={fromId} onChange={e => { setFromId(e.target.value); setDiff(null) }}
          className="h-8 text-xs bg-input border border-border rounded-md px-2 text-foreground">
          <option value="">Select source…</option>
          {envList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

        <select value={toId} onChange={e => { setToId(e.target.value); setDiff(null) }}
          className="h-8 text-xs bg-input border border-border rounded-md px-2 text-foreground">
          <option value="">Select target…</option>
          {envList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        <Button size="sm" className="h-8 text-xs" disabled={!fromId || !toId || fromId === toId || loading} onClick={runDiff}>
          {loading ? "Comparing…" : "Run Diff"}
        </Button>
      </div>

      {diff !== null && (
        <>
          {counts && (
            <div className="flex gap-4 text-xs text-muted-foreground mb-3">
              <span className="text-yellow-400">{counts.changed} changed</span>
              <span className="text-red-400">{counts.missing - counts.changed} missing</span>
              <span>{counts.same} same</span>
            </div>
          )}

          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">KEY</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {diff.map((entry, i) => {
                  const s = statusLabel[entry.status] ?? { label: entry.status, color: "" }
                  return (
                    <tr key={entry.key} className={`${i > 0 ? "border-t border-border" : ""}`}>
                      <td className="px-3 py-2 font-mono">{entry.key}</td>
                      <td className={cn("px-3 py-2 font-mono", s.color)}>{s.label}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {diff === null && (
        <p className="text-xs text-muted-foreground">Select two environments and click Run Diff.</p>
      )}
    </div>
  )
}
