"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/api"
import { setToken, isLoggedIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Terminal, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    if (isLoggedIn()) router.replace("/projects")
  }, [router])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loading, setLoading] = useState(false)

  const [stateToken, setStateToken] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [totpError, setTotpError] = useState("")
  const [needs2FA, setNeeds2FA] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [useBackup, setUseBackup] = useState(false)
  const [backupCode, setBackupCode] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError("")
    setLoading(true)
    try {
      const result = await auth.login(email, password) as any
      if (result.requires_2fa) {
        setStateToken(result.state_token)
        setNeeds2FA(true)
      } else {
        setToken(result.token)
        const me = await auth.me()
        router.push(me.totp_enabled ? "/projects" : "/setup-2fa")
      }
    } catch (err: any) {
      setLoginError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault()
    setTotpError("")
    setVerifying(true)
    try {
      const { token } = await auth.login2fa(stateToken, totpCode)
      setToken(token)
      router.push("/projects")
    } catch (err: any) {
      setTotpError(err.message)
      setTotpCode("")
    } finally {
      setVerifying(false)
    }
  }

  async function handleBackupCode(e: React.FormEvent) {
    e.preventDefault()
    setTotpError("")
    setVerifying(true)
    try {
      const { token } = await auth.loginBackupCode(stateToken, backupCode)
      setToken(token)
      router.push("/projects")
    } catch (err: any) {
      setTotpError(err.message)
      setBackupCode("")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        {/* logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shadow-[0_0_30px_oklch(0.65_0.18_142/0.12)]">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <span className="font-mono font-semibold text-base tracking-tight">dotkey</span>
        </div>

        {!needs2FA ? (
          <>
            <div className="border border-border rounded-xl p-7 bg-card card-accent shadow-xl shadow-black/20">
              <h1 className="text-base font-semibold mb-1">Sign in</h1>
              <p className="text-sm text-muted-foreground mb-6">Welcome back.</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                  <Input id="email" type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setLoginError("") }}
                    placeholder="you@example.com" required
                    className={cn("h-9 bg-input border-border", loginError && "border-destructive")} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">Forgot password?</Link>
                  </div>
                  <Input id="password" type="password" value={password}
                    onChange={e => { setPassword(e.target.value); setLoginError("") }}
                    placeholder="••••••••" required
                    className={cn("h-9 bg-input border-border", loginError && "border-destructive")} />
                  {loginError && <p className="text-xs text-destructive">{loginError}</p>}
                </div>
                <Button type="submit" disabled={loading} className="w-full h-9 btn-glow">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-5">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-foreground hover:text-primary transition-colors">Register</Link>
            </p>
          </>
        ) : (
          <div className="border border-border rounded-xl p-7 bg-card card-accent shadow-xl shadow-black/20">
            <div className="flex items-center gap-2.5 mb-1">
              <Shield className="h-4 w-4 text-primary" />
              <h1 className="text-base font-semibold">Two-factor authentication</h1>
            </div>
            <p className="text-sm text-muted-foreground mb-7">
              {useBackup
                ? "Enter one of your 8-character backup codes."
                : "Enter the 6-digit code from your authenticator app."}
            </p>

            {!useBackup ? (
              <form onSubmit={handle2FA} className="space-y-4">
                <div className="space-y-1.5">
                  <Input
                    value={totpCode}
                    onChange={e => { setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setTotpError("") }}
                    placeholder="000 000"
                    className={cn("h-13 text-center font-mono text-2xl tracking-[0.6em] bg-input border-border", totpError && "border-destructive")}
                    maxLength={6}
                    autoFocus
                    autoComplete="one-time-code"
                  />
                  {totpError && <p className="text-xs text-destructive">{totpError}</p>}
                </div>
                <Button type="submit" disabled={totpCode.length < 6 || verifying} className="w-full h-9 btn-glow">
                  {verifying ? "Verifying…" : "Verify"}
                </Button>
                <div className="flex flex-col gap-1.5 items-center">
                  <button
                    type="button"
                    onClick={() => { setUseBackup(true); setTotpCode(""); setTotpError("") }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Use a backup code instead
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNeeds2FA(false); setStateToken(""); setTotpCode("") }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBackupCode} className="space-y-4">
                <div className="space-y-1.5">
                  <Input
                    value={backupCode}
                    onChange={e => { setBackupCode(e.target.value.toUpperCase().slice(0, 9)); setTotpError("") }}
                    placeholder="XXXX-XXXX"
                    className={cn("h-13 text-center font-mono text-xl tracking-widest bg-input border-border", totpError && "border-destructive")}
                    maxLength={9}
                    autoFocus
                    autoComplete="off"
                  />
                  {totpError && <p className="text-xs text-destructive">{totpError}</p>}
                </div>
                <Button type="submit" disabled={backupCode.length < 8 || verifying} className="w-full h-9 btn-glow">
                  {verifying ? "Verifying…" : "Use backup code"}
                </Button>
                <div className="flex flex-col gap-1.5 items-center">
                  <button
                    type="button"
                    onClick={() => { setUseBackup(false); setBackupCode(""); setTotpError("") }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Use authenticator app instead
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNeeds2FA(false); setStateToken(""); setBackupCode("") }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to login
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
