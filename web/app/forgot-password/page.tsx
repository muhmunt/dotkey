"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Terminal } from "lucide-react"
import { cn } from "@/lib/utils"

type Step = "email" | "verify"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [stateToken, setStateToken] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function clearError(key: string) {
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address"
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const res = await auth.forgotPassword(email)
      if (res.state_token) {
        setStateToken(res.state_token)
        setStep("verify")
      } else {
        // No account / 2FA not set up — show generic message to prevent enumeration
        setErrors({ email: "No account with 2FA found for that email. Set up 2FA before resetting your password." })
      }
    } catch {
      setErrors({ email: "Something went wrong. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!code || code.length !== 6) errs.code = "Enter the 6-digit code from your authenticator"
    if (newPassword.length < 8) errs.newPassword = "Password must be at least 8 characters"
    if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match"
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await auth.resetPassword(stateToken, code, newPassword)
      router.push("/login?reset=1")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Reset failed"
      if (msg.includes("session expired") || msg.includes("start over")) {
        setErrors({ code: "Session expired — start over." })
        setStep("email")
      } else if (msg.includes("2FA") || msg.includes("invalid")) {
        setErrors({ code: "Invalid 2FA code" })
      } else {
        setErrors({ code: msg })
      }
    } finally {
      setLoading(false)
    }
  }

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
          {step === "email" ? (
            <>
              <h1 className="text-base font-semibold mb-1">Reset your password</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email address. You&apos;ll verify with your authenticator app.
              </p>
              <form onSubmit={handleEmail} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                  <Input
                    id="email" type="email" value={email}
                    onChange={e => { setEmail(e.target.value); clearError("email") }}
                    placeholder="you@example.com" required
                    className={cn("h-9 bg-input border-border", errors.email && "border-destructive")}
                    autoFocus
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <Button type="submit" disabled={loading} className="w-full h-9 btn-glow">
                  {loading ? "Checking…" : "Continue"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-base font-semibold mb-1">Verify &amp; set new password</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter the code from your authenticator app and choose a new password.
              </p>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs font-medium text-muted-foreground">Authenticator code</Label>
                  <Input
                    id="code" type="text" inputMode="numeric" pattern="[0-9]*"
                    value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); clearError("code") }}
                    placeholder="000000" maxLength={6}
                    className={cn("h-9 bg-input border-border font-mono tracking-widest", errors.code && "border-destructive")}
                    autoFocus
                  />
                  {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-medium text-muted-foreground">New password</Label>
                  <Input
                    id="newPassword" type="password" value={newPassword}
                    onChange={e => { setNewPassword(e.target.value); clearError("newPassword") }}
                    placeholder="min. 8 characters" required
                    className={cn("h-9 bg-input border-border", errors.newPassword && "border-destructive")}
                  />
                  {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">Confirm password</Label>
                  <Input
                    id="confirmPassword" type="password" value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); clearError("confirmPassword") }}
                    placeholder="repeat new password" required
                    className={cn("h-9 bg-input border-border", errors.confirmPassword && "border-destructive")}
                  />
                  {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
                </div>
                <Button type="submit" disabled={loading} className="w-full h-9 btn-glow">
                  {loading ? "Resetting…" : "Reset password"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          {step === "verify" ? (
            <button type="button" onClick={() => { setStep("email"); setErrors({}) }} className="text-foreground hover:text-primary transition-colors">
              ← Use a different email
            </button>
          ) : (
            <Link href="/login" className="text-foreground hover:text-primary transition-colors">← Back to sign in</Link>
          )}
        </p>
      </div>
    </div>
  )
}
