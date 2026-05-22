"use client"

import { useState } from "react"
import { auth } from "@/lib/api"
import { useReveal } from "@/context/reveal-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shield, Lock } from "lucide-react"
import { toast } from "sonner"

interface Props {
  onClose: () => void
  onUnlocked: () => void
}

export function RevealLockModal({ onClose, onUnlocked }: Props) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const { unlock } = useReveal()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { reveal_token, expires_in } = await auth.revealUnlock(code)
      unlock(reveal_token, expires_in)
      onUnlocked()
    } catch (err: any) {
      toast.error(err.message)
      setCode("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium">Unlock Secrets</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Enter your authenticator code to reveal secret values.
          The session stays open for <span className="text-foreground">15 minutes</span>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000 000"
            className="h-12 text-center font-mono text-xl tracking-[0.5em] bg-input border-border"
            maxLength={6}
            autoFocus
            autoComplete="one-time-code"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={code.length < 6 || loading}
              className="flex-1 h-9 text-sm"
            >
              {loading ? "Verifying…" : "Unlock"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 text-sm border-border"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground mt-4 text-center flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" /> Values stay masked until unlocked
        </p>
      </div>
    </div>
  )
}
