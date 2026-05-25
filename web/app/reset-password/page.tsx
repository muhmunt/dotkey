"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Terminal, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (password.length < 8) errs.password = "Password must be at least 8 characters"
    if (!confirm) errs.confirm = "Please confirm your password"
    else if (password !== confirm) errs.confirm = "Passwords do not match"
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await auth.resetPassword(token, password)
      setDone(true)
      setTimeout(() => router.push("/login"), 2500)
    } catch (err: any) {
      setErrors({ password: err.message })
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center py-2">
        <p className="text-sm text-destructive">Invalid reset link.</p>
        <Link href="/forgot-password" className="text-xs text-primary hover:underline mt-2 block">Request a new one →</Link>
      </div>
    )
  }

  return done ? (
    <div className="text-center py-2">
      <CheckCircle className="h-8 w-8 text-primary mx-auto mb-3" />
      <p className="text-sm font-medium mb-1">Password updated</p>
      <p className="text-xs text-muted-foreground">Redirecting to sign in…</p>
    </div>
  ) : (
    <>
      <h1 className="text-base font-semibold mb-1">Set new password</h1>
      <p className="text-sm text-muted-foreground mb-6">Choose a strong password for your account.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">New password</Label>
          <Input
            id="password" type="password" value={password}
            onChange={e => { setPassword(e.target.value); errors.password && setErrors(p => ({ ...p, password: "" })) }}
            placeholder="min. 8 characters" autoFocus
            className={cn("h-9 bg-input border-border", errors.password && "border-destructive")}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-xs font-medium text-muted-foreground">Confirm password</Label>
          <Input
            id="confirm" type="password" value={confirm}
            onChange={e => { setConfirm(e.target.value); errors.confirm && setErrors(p => ({ ...p, confirm: "" })) }}
            placeholder="repeat password"
            className={cn("h-9 bg-input border-border", errors.confirm && "border-destructive")}
          />
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
        </div>
        <Button type="submit" disabled={loading} className="w-full h-9 btn-glow">
          {loading ? "Saving…" : "Set new password"}
        </Button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shadow-[0_0_30px_oklch(0.65_0.18_142/0.12)]">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <span className="font-mono font-semibold text-base tracking-tight">dotkey</span>
        </div>

        <div className="border border-border rounded-xl p-7 bg-card card-accent shadow-xl shadow-black/20">
          <Suspense fallback={<p className="text-xs text-muted-foreground">Loading…</p>}>
            <ResetForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          <Link href="/login" className="text-foreground hover:text-primary transition-colors">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
