"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { auth } from "@/lib/api"
import { isLoggedIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Terminal, CheckCircle } from "lucide-react"
import { toast } from "sonner"

function ActivateForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [code, setCode] = useState(params.get("code") ?? "")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace(`/login?next=/activate${params.get("code") ? `?code=${params.get("code")}` : ""}`)
    }
  }, [router, params])

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await auth.deviceActivate(code.toUpperCase().replace(/\s/g, ""))
      setDone(true)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-border rounded-lg p-6 bg-card">
      {done ? (
        <div className="text-center py-4">
          <CheckCircle className="h-8 w-8 text-primary mx-auto mb-3" />
          <p className="text-sm font-medium">Device approved</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your terminal is now authenticated. You can close this tab.
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-sm font-medium mb-1">Approve CLI Login</h1>
          <p className="text-xs text-muted-foreground mb-5">
            Enter the 8-character code shown in your terminal.
          </p>
          <form onSubmit={handleActivate} className="space-y-4">
            <Input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="ABCD-EF23"
              className="h-10 text-center font-mono text-base tracking-widest bg-input border-border"
              maxLength={9}
              required
            />
            <Button type="submit" disabled={loading || code.length < 8} className="w-full h-8 text-sm">
              {loading ? "Approving..." : "Approve Device"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-4 text-center">Not you? Ignore this page.</p>
        </>
      )}
    </div>
  )
}

export default function ActivatePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Terminal className="h-5 w-5 text-primary" />
          <span className="font-mono font-semibold text-lg">dotkey</span>
        </div>
        <Suspense fallback={<div className="border border-border rounded-lg p-6 bg-card text-xs text-muted-foreground">Loading...</div>}>
          <ActivateForm />
        </Suspense>
      </div>
    </div>
  )
}
