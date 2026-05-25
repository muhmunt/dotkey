"use client"

import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { auth } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, LogOut, Settings, Terminal, Keyboard } from "lucide-react"

export function TopNav({ onShortcuts }: { onShortcuts?: () => void }) {
  const router = useRouter()
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: auth.me, retry: false })

  async function logout() {
    await auth.logout().catch(() => {}) // revoke on server; ignore errors
    clearToken()
    router.push("/login")
  }

  return (
    <header className="h-13 nav-border flex items-center px-5 justify-between shrink-0 bg-card">
      <button
        onClick={() => router.push("/projects")}
        className="flex items-center gap-2.5 group"
      >
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 border border-primary/20 group-hover:border-primary/40 transition-colors">
          <Terminal className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="font-mono font-semibold text-sm tracking-tight text-foreground">dotkey</span>
      </button>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors outline-none group">
            <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              {user.name[0].toUpperCase()}
            </div>
            <span className="hidden sm:block">{user.name}</span>
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer text-sm">
              <Settings className="h-3.5 w-3.5 mr-2" /> Settings
            </DropdownMenuItem>
            {onShortcuts && (
              <DropdownMenuItem onClick={onShortcuts} className="cursor-pointer text-sm">
                <Keyboard className="h-3.5 w-3.5 mr-2" /> Shortcuts
                <span className="ml-auto text-xs text-muted-foreground font-mono">?</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer text-sm focus:text-destructive">
              <LogOut className="h-3.5 w-3.5 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
