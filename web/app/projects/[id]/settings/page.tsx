"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { projects, auth } from "@/lib/api"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export default function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: auth.me })
  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => projects.get(id) })
  const { data: memberList = [] } = useQuery({ queryKey: ["members", id], queryFn: () => projects.members(id) })

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState("")

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description ?? "")
    }
  }, [project])

  const myRole = memberList.find(m => m.user_id === me?.id)?.role ?? ""
  const isOwner = myRole === "owner"
  const canEdit = myRole === "owner" || myRole === "admin"

  const updateProject = useMutation({
    mutationFn: () => projects.update(id, name, description),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["project", id] })
      qc.invalidateQueries({ queryKey: ["projects"] })
      toast.success("Project updated")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteProject = useMutation({
    mutationFn: () => projects.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      toast.success("Project deleted")
      router.replace("/projects")
    },
    onError: (err: any) => toast.error(err.message),
  })

  const canDelete = deleteConfirm === project?.name

  return (
    <div className="p-5 max-w-md">
      <div className="flex items-center gap-2 mb-5">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-medium">Project Settings</h1>
      </div>

      {/* general */}
      <div className="border border-border rounded-md overflow-hidden mb-5">
        <div className="px-4 py-2.5 border-b border-border bg-card/50">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">General</p>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-muted-foreground">Project name</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!canEdit}
              className="h-8 text-sm bg-input border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-xs text-muted-foreground">
              Description <span className="opacity-50">(optional)</span>
            </Label>
            <Input
              id="desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={!canEdit}
              className="h-8 text-sm bg-input border-border"
            />
          </div>
          {canEdit && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => updateProject.mutate()}
              disabled={updateProject.isPending || !name.trim()}
            >
              {updateProject.isPending ? "Saving…" : "Save changes"}
            </Button>
          )}
        </div>
      </div>

      {/* danger zone — owner only */}
      {isOwner && (
        <div className="border border-destructive/40 rounded-md overflow-hidden">
          <div className="px-4 py-2.5 border-b border-destructive/40 bg-destructive/5">
            <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Danger Zone
            </p>
          </div>

          <div className="p-4">
            <p className="text-xs font-medium mb-1">Delete this project</p>
            <p className="text-xs text-muted-foreground mb-4">
              This permanently deletes the project, all environments, all variables, and
              the complete version history. This action cannot be undone.
            </p>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Type <span className="font-mono text-foreground">{project?.name}</span> to confirm
              </Label>
              <Input
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder={project?.name}
                className="h-8 text-sm bg-input border-border font-mono"
              />
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs gap-1.5 w-full"
                disabled={!canDelete || deleteProject.isPending}
                onClick={() => deleteProject.mutate()}
              >
                <Trash2 className="h-3 w-3" />
                {deleteProject.isPending ? "Deleting…" : "Delete Project"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!canEdit && (
        <p className="text-xs text-muted-foreground mt-4">
          Only owners and admins can edit project settings.
        </p>
      )}
    </div>
  )
}
