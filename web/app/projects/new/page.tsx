"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { projects } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function NewProjectPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [nameError, setNameError] = useState("")

  const create = useMutation({
    mutationFn: () => projects.create(name.trim(), description.trim()),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      toast.success(`Project "${p.name}" created`)
      router.push(`/projects/${p.id}`)
    },
    onError: (err: any) => toast.error(err.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) { setNameError("Name must be at least 2 characters"); return }
    setNameError("")
    create.mutate()
  }

  return (
    <AppShell>
      <div className="p-6 max-w-md">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        <h1 className="text-sm font-medium mb-5">New Project</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-muted-foreground">Project name</Label>
            <Input id="name" value={name}
              onChange={e => { setName(e.target.value); nameError && setNameError("") }}
              placeholder="my-service" required
              className={cn("h-8 text-sm bg-input border-border", nameError && "border-destructive")} />
            {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-xs text-muted-foreground">Description <span className="opacity-50">(optional)</span></Label>
            <Input id="desc" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What does this project do?" className="h-8 text-sm bg-input border-border" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={create.isPending} size="sm" className="h-7 text-xs">
              {create.isPending ? "Creating…" : "Create Project"}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  )
}
