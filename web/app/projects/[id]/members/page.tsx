"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { projects, users, auth } from "@/lib/api"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Trash2, Crown, Shield, Code2, Eye } from "lucide-react"
import { toast } from "sonner"
import { cn, formatDate } from "@/lib/utils"
import type { ProjectMember } from "@/lib/api"

const ROLES = ["admin", "developer", "readonly"] as const
type Role = typeof ROLES[number]

const roleConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  owner:     { label: "Owner",     icon: <Crown className="h-3 w-3" />,   color: "text-yellow-400" },
  admin:     { label: "Admin",     icon: <Shield className="h-3 w-3" />,  color: "text-blue-400" },
  developer: { label: "Developer", icon: <Code2 className="h-3 w-3" />,   color: "text-emerald-400" },
  readonly:  { label: "Read-only", icon: <Eye className="h-3 w-3" />,     color: "text-muted-foreground" },
}

export default function MembersPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: auth.me })
  const { data: memberList = [], isLoading } = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => projects.members(projectId),
  })

  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("developer")
  const [lookupResult, setLookupResult] = useState<{ id: string; name: string; email: string } | null>(null)
  const [lookupError, setLookupError] = useState("")
  const [looking, setLooking] = useState(false)

  const myRole = memberList.find(m => m.user_id === me?.id)?.role ?? ""
  const canManage = myRole === "owner" || myRole === "admin"

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLooking(true)
    setLookupResult(null)
    setLookupError("")
    try {
      const user = await users.search(email.trim())
      setLookupResult(user)
    } catch {
      setLookupError("No account found with that email")
    } finally {
      setLooking(false)
    }
  }

  const addMember = useMutation({
    mutationFn: () => projects.addMember(projectId, email.trim(), role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", projectId] })
      setEmail("")
      setLookupResult(null)
      toast.success("Member added")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const updateRole = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: string }) =>
      projects.updateMemberRole(projectId, uid, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", projectId] })
      toast.success("Role updated")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const removeMember = useMutation({
    mutationFn: (uid: string) => projects.removeMember(projectId, uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", projectId] })
      toast.success("Member removed")
    },
    onError: (err: any) => toast.error(err.message),
  })

  return (
    <div className="p-5 max-w-2xl">
      <div className="flex items-center gap-2 mb-5">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-medium">Members</h1>
        <span className="text-xs text-muted-foreground ml-1">({memberList.length})</span>
      </div>

      {/* invite form — only for owner/admin */}
      {canManage && (
        <div className="border border-border rounded-md p-4 mb-5 bg-card">
          <p className="text-xs font-medium mb-3 flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" /> Invite member
          </p>

          <form onSubmit={handleLookup} className="flex gap-2 mb-3">
            <Input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setLookupResult(null); setLookupError("") }}
              placeholder="colleague@example.com"
              className="h-8 text-xs bg-input border-border flex-1"
            />
            <Button type="submit" variant="outline" size="sm" className="h-8 text-xs border-border shrink-0" disabled={looking}>
              {looking ? "Looking up…" : "Look up"}
            </Button>
          </form>

          {lookupError && (
            <p className="text-xs text-destructive mb-3">{lookupError}</p>
          )}

          {lookupResult && (
            <div className="flex items-center gap-3 p-2.5 bg-accent/30 rounded border border-border mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{lookupResult.name}</p>
                <p className="text-xs text-muted-foreground">{lookupResult.email}</p>
              </div>
              <select
                value={role}
                onChange={e => setRole(e.target.value as Role)}
                className="h-7 text-xs bg-input border border-border rounded px-2 text-foreground"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{roleConfig[r].label}</option>
                ))}
              </select>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => addMember.mutate()}
                disabled={addMember.isPending}
              >
                {addMember.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            The user must already have an EnvX account.
          </p>
        </div>
      )}

      {/* member list */}
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}

      {!isLoading && (
        <div className="border border-border rounded-md overflow-hidden">
          {memberList.map((member, i) => (
            <MemberRow
              key={member.id}
              member={member}
              isMe={member.user_id === me?.id}
              canManage={canManage}
              isFirst={i === 0}
              onRoleChange={(uid, r) => updateRole.mutate({ uid, role: r })}
              onRemove={(uid) => {
                if (confirm("Remove this member?")) removeMember.mutate(uid)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MemberRow({
  member, isMe, canManage, isFirst, onRoleChange, onRemove,
}: {
  member: ProjectMember
  isMe: boolean
  canManage: boolean
  isFirst: boolean
  onRoleChange: (uid: string, role: string) => void
  onRemove: (uid: string) => void
}) {
  const rc = roleConfig[member.role] ?? roleConfig.readonly
  const isOwner = member.role === "owner"

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3",
      !isFirst && "border-t border-border"
    )}>
      {/* avatar placeholder */}
      <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center shrink-0">
        <span className="text-xs font-medium">
          {(member.user?.name ?? "?")[0].toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">{member.user?.name ?? "Unknown"}</span>
          {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate">{member.user?.email ?? "—"}</p>
      </div>

      {/* role */}
      {canManage && !isOwner && !isMe ? (
        <select
          value={member.role}
          onChange={e => onRoleChange(member.user_id, e.target.value)}
          className="h-7 text-xs bg-input border border-border rounded px-2 text-foreground"
        >
          {ROLES.map(r => (
            <option key={r} value={r}>{roleConfig[r].label}</option>
          ))}
        </select>
      ) : (
        <span className={cn("flex items-center gap-1 text-xs", rc.color)}>
          {rc.icon} {rc.label}
        </span>
      )}

      {/* remove */}
      {canManage && !isOwner && !isMe && (
        <button
          onClick={() => onRemove(member.user_id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Remove member"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
