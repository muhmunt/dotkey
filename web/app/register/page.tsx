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
import { cn } from "@/lib/utils"

type FieldErrors = Partial<Record<"name" | "email" | "password" | "confirm", string>>

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    if (isLoggedIn()) router.replace("/projects")
  }, [router])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  function validate(): FieldErrors {
    const e: FieldErrors = {}
    if (!name.trim()) e.name = "Name is required"
    if (!email.trim()) e.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address"
    if (password.length < 8) e.password = "Password must be at least 8 characters"
    if (!confirm) e.confirm = "Please confirm your password"
    else if (password !== confirm) e.confirm = "Passwords do not match"
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      const { token } = await auth.register(name, email, password)
      setToken(token)
      router.push("/setup-2fa?onboarding=true")
    } catch (err: any) {
      setErrors({ email: err.message })
    } finally {
      setLoading(false)
    }
  }

  function field(key: keyof FieldErrors) {
    return {
      className: cn("h-9 bg-input border-border", errors[key] && "border-destructive focus-visible:ring-destructive"),
      onChange: () => errors[key] && setErrors(p => ({ ...p, [key]: undefined })),
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
          <h1 className="text-base font-semibold mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">Start managing environment variables in minutes.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Name</Label>
              <Input id="name" value={name}
                onChange={e => { setName(e.target.value); field("name").onChange() }}
                placeholder="Muhammad" required {...{ className: field("name").className }} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input id="email" type="email" value={email}
                onChange={e => { setEmail(e.target.value); errors.email && setErrors(p => ({ ...p, email: undefined })) }}
                placeholder="you@example.com" required className={field("email").className} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
              <Input id="password" type="password" value={password}
                onChange={e => { setPassword(e.target.value); errors.password && setErrors(p => ({ ...p, password: undefined })) }}
                placeholder="min. 8 characters" required minLength={8} className={field("password").className} />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-xs font-medium text-muted-foreground">Confirm password</Label>
              <Input id="confirm" type="password" value={confirm}
                onChange={e => { setConfirm(e.target.value); errors.confirm && setErrors(p => ({ ...p, confirm: undefined })) }}
                placeholder="repeat password" required className={field("confirm").className} />
              {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
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
