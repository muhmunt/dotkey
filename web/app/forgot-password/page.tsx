"use client"

import { useState } from "react"
import Link from "next/link"
import { auth } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Terminal, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address")
      return
    }
    setEmailError("")
    setLoading(true)
    try {
      await auth.forgotPassword(email)
      setSent(true)
    } catch {
      setSent(true) // always show success to prevent enumeration
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
          {sent ? (
            <div className="text-center py-2">
              <CheckCircle className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="text-sm font-medium mb-2">Check your email</p>
              <p className="text-xs text-muted-foreground">
                If <span className="font-mono text-foreground">{email}</span> is registered, a reset link has been sent. Check your spam folder if it doesn&apos;t arrive.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-base font-semibold mb-1">Reset your password</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                  <Input
                    id="email" type="email" value={email}
                    onChange={e => { setEmail(e.target.value); emailError && setEmailError("") }}
                    placeholder="you@example.com" required
                    className={cn("h-9 bg-input border-border", emailError && "border-destructive")}
                    autoFocus
                  />
                  {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                </div>
                <Button type="submit" disabled={loading} className="w-full h-9 btn-glow">
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          <Link href="/login" className="text-foreground hover:text-primary transition-colors">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
