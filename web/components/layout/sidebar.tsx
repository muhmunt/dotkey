"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { projects } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Plus, ChevronRight } from "lucide-react"

const DOT_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-yellow-500",
]

function projectDotColor(name: string) {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return DOT_COLORS[hash % DOT_COLORS.length]
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: list = [] } = useQuery({ queryKey: ["projects"], queryFn: projects.list })

  return (
    <aside className="w-52 shrink-0 border-r border-border bg-card flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Projects
        </span>
        <button
          onClick={() => router.push("/projects/new")}
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="New project"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-1.5">
        {list.length === 0 && (
          <p className="px-4 py-2 text-xs text-muted-foreground italic">No projects yet</p>
        )}
        {list.map((p) => {
          const active = pathname.startsWith(`/projects/${p.id}`)
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className={cn(
                "group flex items-center gap-2.5 px-4 py-2 text-sm transition-all",
                active
                  ? "text-foreground bg-accent/60 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
              )}
            >
              <span className={cn(
                "w-2 h-2 rounded-full shrink-0 transition-opacity",
                projectDotColor(p.name),
                !active && "opacity-60 group-hover:opacity-100"
              )} />
              <span className="truncate flex-1">{p.name}</span>
              {active && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border px-4 py-3">
        <button
          onClick={() => router.push("/projects/new")}
          className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="h-3 w-3" />
          New project
        </button>
      </div>
    </aside>
  )
}
