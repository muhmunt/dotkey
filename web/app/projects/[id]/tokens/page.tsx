"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { tokens, auth } from "@/lib/api"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CodeBlock } from "@/components/welcome/code-block"
import { Key, Plus, Trash2, Copy, Check, AlertTriangle } from "lucide-react"
import { formatDate, cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ProjectToken } from "@/lib/api"

export default function TokensPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: auth.me })
  const { data: tokenList = [], isLoading } = useQuery({
    queryKey: ["tokens", projectId],
    queryFn: () => tokens.list(projectId),
  })

  const [showCreate, setShowCreate] = useState(false)
  const [tokenName, setTokenName] = useState("")
  const [permissions, setPermissions] = useState("read")
  const [createdToken, setCreatedToken] = useState("")
  const [copied, setCopied] = useState(false)

  const createToken = useMutation({
    mutationFn: () => tokens.create(projectId, tokenName.trim(), permissions),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["tokens", projectId] })
      setCreatedToken(result.token)
      setTokenName("")
      setShowCreate(false)
    },
    onError: (err: any) => toast.error(err.message),
  })

  const revokeToken = useMutation({
    mutationFn: (tid: string) => tokens.revoke(projectId, tid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tokens", projectId] })
      toast.success("Token revoked")
    },
    onError: (err: any) => toast.error(err.message),
  })

  async function copyToken() {
    await navigator.clipboard.writeText(createdToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-5 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-medium">API Tokens</h1>
        </div>
        <Button size="sm" className="gap-1.5 h-7 text-xs btn-glow" onClick={() => setShowCreate(v => !v)}>
          <Plus className="h-3.5 w-3.5" /> New Token
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-5">
        Project tokens never expire and are scoped to this project only.
        Use them in CI/CD pipelines instead of your personal JWT.
      </p>

      {/* one-time token reveal */}
      {createdToken && (
        <div className="border border-primary/30 rounded-lg p-4 mb-5 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <p className="text-xs font-medium text-yellow-400">Copy this token now — it won&apos;t be shown again.</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono bg-card border border-border rounded px-3 py-2 flex-1 break-all">
              {createdToken}
            </code>
            <button
              onClick={copyToken}
              className="shrink-0 p-2 rounded border border-border bg-card hover:bg-accent transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-7 text-xs border-border"
            onClick={() => setCreatedToken("")}
          >
            Done
          </Button>
        </div>
      )}

      {/* create form */}
      {showCreate && !createdToken && (
        <div className="border border-border rounded-lg p-4 mb-5 bg-card">
          <p className="text-xs font-medium mb-4">Generate new token</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Token name</Label>
              <Input
                value={tokenName}
                onChange={e => setTokenName(e.target.value)}
                placeholder="github-deploy"
                className="h-8 text-sm bg-input border-border"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Permissions</Label>
              <div className="flex gap-3">
                {[
                  { value: "read", label: "Read-only", desc: "Can pull secrets" },
                  { value: "read_write", label: "Read + write", desc: "Can pull and push" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPermissions(opt.value)}
                    className={cn(
                      "flex-1 text-left p-3 rounded border text-xs transition-colors",
                      permissions === opt.value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-input text-muted-foreground hover:border-border/80"
                    )}
                  >
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="h-7 text-xs btn-glow"
                disabled={!tokenName.trim() || createToken.isPending}
                onClick={() => createToken.mutate()}
              >
                {createToken.isPending ? "Generating…" : "Generate Token"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setShowCreate(false); setTokenName("") }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* token list */}
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}

      {!isLoading && tokenList.length === 0 && !showCreate && (
        <div className="border border-border rounded-lg p-8 text-center">
          <Key className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tokens yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Generate a token to use in CI/CD pipelines.
          </p>
        </div>
      )}

      {tokenList.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden mb-6">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-card/50">
                <th className="text-left px-4 py-2 text-muted-foreground font-medium">NAME</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium hidden sm:table-cell">PREFIX</th>
                <th className="text-left px-4 py-2 text-muted-foreground font-medium hidden sm:table-cell">PERMISSIONS</th>
                <th className="text-right px-4 py-2 text-muted-foreground font-medium hidden sm:table-cell">LAST USED</th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {tokenList.map((t: ProjectToken, i) => (
                <tr key={t.id} className={cn(i > 0 && "border-t border-border", "hover:bg-accent/20")}>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground hidden sm:table-cell">
                    {t.token_prefix}…
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-xs",
                      t.permissions === "read_write"
                        ? "bg-blue-400/10 text-blue-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {t.permissions === "read_write" ? "read + write" : "read-only"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-right hidden sm:table-cell">
                    {t.last_used_at ? formatDate(t.last_used_at) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { if (confirm(`Revoke token "${t.name}"?`)) revokeToken.mutate(t.id) }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Revoke"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* usage guide */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-card/50">
          <p className="text-xs font-semibold">Usage in GitHub Actions</p>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground">Add your token to GitHub Secrets as <code className="font-mono text-foreground">ENVX_TOKEN</code>, then:</p>
          <CodeBlock
            prompt={false}
            code={`- name: Pull env vars
  run: dotkey pull production
  env:
    ENVX_TOKEN: \${{ secrets.ENVX_TOKEN }}
    ENVX_API_URL: http://localhost:8080`}
          />
        </div>
      </div>
    </div>
  )
}
