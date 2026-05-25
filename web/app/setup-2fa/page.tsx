"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { auth } from "@/lib/api"
import { isLoggedIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Terminal, Shield, Smartphone } from "lucide-react"
import { toast } from "sonner"
import QRCode from "react-qr-code"

type Step = "intro" | "scan" | "confirm"

export default function Setup2FAPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("intro")
  const [qrURL, setQrURL] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: auth.me,
    enabled: isLoggedIn(),
  })

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login")
      return
    }
    if (user?.totp_enabled) {
      router.replace("/projects")
    }
  }, [user, router])

  async function startSetup() {
    setLoading(true)
    try {
      const { qr_url } = await auth.setup2fa()
      setQrURL(qr_url)
      setStep("scan")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await auth.confirm2fa(code)
      toast.success("2FA enabled — your account is now protected")
      router.replace("/projects")
    } catch (err: any) {
      toast.error(err.message)
      setCode("")
    } finally {
      setLoading(false)
    }
  }

  if (userLoading || !user) return null

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

        <div className="border border-border rounded-xl p-7 bg-card card-accent shadow-xl shadow-black/20">
          {step === "intro" && (
            <>
              <div className="flex items-center gap-2.5 mb-1">
                <Shield className="h-4 w-4 text-primary" />
                <h1 className="text-base font-semibold">Secure your account</h1>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Two-factor authentication is required before you can access the dashboard.
                It protects your secrets and is used every time you reveal a secret value.
              </p>
              <Button
                className="w-full h-9 btn-glow gap-2"
                onClick={startSetup}
                disabled={loading}
              >
                <Smartphone className="h-4 w-4" />
                {loading ? "Generating…" : "Set up 2FA"}
              </Button>
            </>
          )}

          {step === "scan" && (
            <>
              <h1 className="text-base font-semibold mb-1">Scan the QR code</h1>
              <p className="text-sm text-muted-foreground mb-5">
                Open your authenticator app (Google Authenticator, Authy, 1Password) and scan this code.
              </p>
              <div className="bg-white p-3 rounded-md inline-block mb-4">
                <QRCode value={qrURL} size={160} />
              </div>
              <p className="text-xs text-muted-foreground mb-2">Can&apos;t scan? Copy this URL into your app:</p>
              <code className="text-xs text-muted-foreground break-all block bg-input border border-border rounded px-2 py-1.5 mb-5">
                {qrURL}
              </code>
              <Button className="w-full h-9" onClick={() => setStep("confirm")}>
                I&apos;ve scanned it →
              </Button>
            </>
          )}

          {step === "confirm" && (
            <>
              <h1 className="text-base font-semibold mb-1">Enter the code</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Enter the 6-digit code from your authenticator app to confirm setup.
              </p>
              <form onSubmit={confirmSetup} className="space-y-4">
                <Input
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000 000"
                  className="h-13 text-center font-mono text-2xl tracking-[0.6em] bg-input border-border"
                  maxLength={6}
                  autoFocus
                  autoComplete="one-time-code"
                />
                <Button
                  type="submit"
                  className="w-full h-9 btn-glow"
                  disabled={code.length < 6 || loading}
                >
                  {loading ? "Verifying…" : "Enable 2FA"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("scan"); setCode("") }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to QR code
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
