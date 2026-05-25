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
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    if (isLoggedIn()) router.replace("/projects")
  }, [router])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const [stateToken, setStateToken] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [needs2FA, setNeeds2FA] = useState(false)
  const [verifying, setVerifying] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await auth.login(email, password) as any
      if (result.requires_2fa) {
        setStateToken(result.state_token)
        setNeeds2FA(true)
      } else {
        setToken(result.token)
        router.push("/projects")
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    try {
      const { token } = await auth.login2fa(stateToken, totpCode)
      setToken(token)
      router.push("/projects")
    } catch (err: any) {
      toast.error(err.message)
      setTotpCode("")
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
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" required className="h-9 bg-input border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required className="h-9 bg-input border-border" />
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
              Enter the 6-digit code from your authenticator app.
            </p>
            <form onSubmit={handle2FA} className="space-y-4">
              <Input
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000 000"
                className="h-13 text-center font-mono text-2xl tracking-[0.6em] bg-input border-border"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
              />
              <Button type="submit" disabled={totpCode.length < 6 || verifying} className="w-full h-9 btn-glow">
                {verifying ? "Verifying…" : "Verify"}
              </Button>
              <button
                type="button"
                onClick={() => { setNeeds2FA(false); setStateToken(""); setTotpCode("") }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to login
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
