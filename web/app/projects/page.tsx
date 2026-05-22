"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { projects } from "@/lib/api"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { CodeBlock } from "@/components/welcome/code-block"
import { Plus, FolderOpen, ChevronRight, Terminal, ArrowRight } from "lucide-react"
import { formatDate } from "@/lib/utils"

const DOT_COLORS = [
  "bg-emerald-500", "bg-blue-500", "bg-violet-500",
  "bg-orange-500", "bg-pink-500", "bg-cyan-500", "bg-yellow-500",
]

function projectDotColor(name: string) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return DOT_COLORS[hash % DOT_COLORS.length]
}

export default function ProjectsPage() {
  const router = useRouter()
  const { data: list = [], isLoading } = useQuery({ queryKey: ["projects"], queryFn: projects.list })

  return (
    <AppShell>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-base font-semibold">Projects</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {list.length} project{list.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button size="sm" className="gap-1.5 btn-glow" onClick={() => router.push("/projects/new")}>
            <Plus className="h-3.5 w-3.5" /> New Project
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-card border border-border animate-pulse" />
            ))}
          </div>
        )}

        {/* empty state */}
        {!isLoading && list.length === 0 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-8">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Terminal className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-base font-semibold mb-2">Welcome to dotkey</h2>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Create a project to start managing environment variables.
                  Each project maps to a repo or service.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button className="gap-2 btn-glow" onClick={() => router.push("/projects/new")}>
                  <Plus className="h-4 w-4" /> Create your first project
                </Button>
                <Button variant="outline" className="gap-2 border-border" onClick={() => router.push("/welcome")}>
                  View setup guide <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* quick CLI guide */}
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Quick CLI setup
              </p>
              <div className="space-y-2">
                <CodeBlock code="dotkey login" />
                <CodeBlock code="dotkey project use my-service" />
                <CodeBlock code="dotkey pull" />
              </div>
            </div>
          </div>
        )}

        {/* project list */}
        {list.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden">
            {list.map((p, i) => (
              <button
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                className={`group w-full flex items-center justify-between px-5 py-4 hover:bg-accent/40 transition-all text-left ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${projectDotColor(p.name)}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-xs text-muted-foreground hidden sm:block">{formatDate(p.created_at)}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
