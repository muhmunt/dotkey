"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { webhooks, type WebhookDelivery } from "@/lib/api"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Webhook, Plus, Trash2, X, ChevronDown, ChevronUp } from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

const ALL_EVENTS = ["variable.created", "variable.updated", "variable.deleted"]

export default function WebhooksPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["webhooks", projectId],
    queryFn: () => webhooks.list(projectId),
  })

  const [showAdd, setShowAdd] = useState(false)
  const [openDeliveries, setOpenDeliveries] = useState<string | null>(null)

  const { data: deliveries = [] } = useQuery({
    queryKey: ["deliveries", projectId, openDeliveries],
    queryFn: () => webhooks.deliveries(projectId, openDeliveries!),
    enabled: !!openDeliveries,
  })
  const [url, setUrl] = useState("")
  const [urlError, setUrlError] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set(ALL_EVENTS))

  const create = useMutation({
    mutationFn: () => webhooks.create(projectId, url.trim(), [...selectedEvents]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks", projectId] })
      setShowAdd(false); setUrl(""); setUrlError(""); setSelectedEvents(new Set(ALL_EVENTS))
      toast.success("Webhook created")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => webhooks.delete(projectId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks", projectId] })
      toast.success("Webhook deleted")
    },
    onError: (err: any) => toast.error(err.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try { new URL(url.trim()) } catch { setUrlError("Enter a valid URL"); return }
    if (selectedEvents.size === 0) { toast.error("Select at least one event"); return }
    setUrlError("")
    create.mutate()
  }

  function toggleEvent(event: string) {
    setSelectedEvents(prev => {
      const next = new Set(prev)
      next.has(event) ? next.delete(event) : next.add(event)
      return next
    })
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-5">
        <Webhook className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-medium">Webhooks</h1>
        <span className="text-xs text-muted-foreground">({list.length})</span>
        <Button
          size="sm" variant="outline"
          className="ml-auto h-7 text-xs border-border gap-1.5"
          onClick={() => setShowAdd(v => !v)}
        >
          <Plus className="h-3 w-3" /> Add webhook
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-5">
        dotkey will send a signed <code className="font-mono bg-input px-1 rounded">POST</code> request to your URL when variable events occur.
        Verify the <code className="font-mono bg-input px-1 rounded">X-Dotkey-Signature</code> header using the HMAC-SHA256 signature with your webhook secret.
      </p>

      {showAdd && (
        <form onSubmit={handleSubmit} className="mb-5 p-4 border border-primary/30 rounded-lg bg-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">New webhook</p>
            <button type="button" onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Payload URL</label>
            <Input
              value={url}
              onChange={e => { setUrl(e.target.value); urlError && setUrlError("") }}
              placeholder="https://example.com/hooks/dotkey"
              className={cn("h-8 text-sm bg-input border-border font-mono", urlError && "border-destructive")}
              autoFocus
            />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Events</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(event => (
                <button
                  key={event} type="button"
                  onClick={() => toggleEvent(event)}
                  className={cn(
                    "text-xs font-mono px-2 py-1 rounded border transition-colors",
                    selectedEvents.has(event)
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create webhook"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}

      {!isLoading && list.length === 0 && (
        <p className="text-xs text-muted-foreground">No webhooks yet. Add one to receive notifications on variable changes.</p>
      )}

      {list.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden">
          {list.map((hook, i) => (
            <div key={hook.id} className={cn(i > 0 && "border-t border-border")}>
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-foreground truncate">{hook.url}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {hook.events.map(ev => (
                      <span key={ev} className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {ev}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Added {formatDate(hook.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setOpenDeliveries(prev => prev === hook.id ? null : hook.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted/50"
                    title="View deliveries"
                  >
                    {openDeliveries === hook.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Deliveries
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete this webhook?")) remove.mutate(hook.id) }}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete webhook"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {openDeliveries === hook.id && (
                <div className="border-t border-border bg-muted/20 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Last deliveries</p>
                  {deliveries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No deliveries yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {deliveries.map((d: WebhookDelivery) => (
                        <div key={d.id} className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground w-36 shrink-0 font-mono">
                            {new Date(d.delivered_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                          </span>
                          <span className="font-mono text-foreground">{d.event}</span>
                          <span className={cn(
                            "ml-auto shrink-0 font-mono px-1.5 py-0.5 rounded text-xs",
                            d.response_status >= 200 && d.response_status < 300
                              ? "bg-green-500/10 text-green-500 border border-green-500/20"
                              : "bg-destructive/10 text-destructive border border-destructive/20"
                          )}>
                            {d.response_status === 0 ? "timeout" : d.response_status}
                          </span>
                          {d.error && (
                            <span className="text-muted-foreground truncate max-w-[200px]" title={d.error}>
                              {d.error}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
