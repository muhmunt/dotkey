"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/api"
import { setToken, isLoggedIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Terminal } from "lucide-react"
import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    if (isLoggedIn()) router.replace("/projects")
  }, [router])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { token } = await auth.register(name, email, password)
      setToken(token)
      router.push("/setup-2fa?onboarding=true")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
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

        {/* card */}
        <div className="border border-border rounded-xl p-7 bg-card card-accent shadow-xl shadow-black/20">
          <h1 className="text-base font-semibold mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">Start managing environment variables in minutes.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)}
                placeholder="Muhammad" required className="h-9 bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required className="h-9 bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="min. 8 characters" required minLength={8} className="h-9 bg-input border-border" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-9 btn-glow mt-1">
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground hover:text-primary transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
