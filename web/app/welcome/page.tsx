"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { projects } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CodeBlock } from "@/components/welcome/code-block"
import { Terminal, Shield, Users, Zap, ArrowRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Slide = 0 | 1 | 2 | 3

const TOTAL = 4

export default function WelcomePage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [slide, setSlide] = useState<Slide>(0)
  const [projectName, setProjectName] = useState("")
  const [createdId, setCreatedId] = useState("")

  function finish(projectId?: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("envx_welcomed", "1")
    }
    router.push(projectId ? `/projects/${projectId}` : "/projects")
  }

  const createProject = useMutation({
    mutationFn: () => projects.create(projectName.trim(), ""),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["projects"] })
      setCreatedId(p.id)
      next()
    },
    onError: (err: any) => toast.error(err.message),
  })

  function next() {
    if (slide < TOTAL - 1) setSlide((s) => (s + 1) as Slide)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* progress dots */}
      {slide > 0 && (
        <div className="flex gap-1.5 mb-10">
          {[1, 2, 3].map((i) => (
            <span key={i} className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              slide >= i ? "bg-primary" : "bg-border"
            )} />
          ))}
        </div>
      )}

      <div className="w-full max-w-lg">
        {slide === 0 && <SlideIntro onNext={next} onSkip={() => finish()} />}
        {slide === 1 && (
          <SlideProject
            value={projectName}
            onChange={setProjectName}
            onSubmit={() => createProject.mutate()}
            loading={createProject.isPending}
            onSkip={() => { setSlide(2) }}
          />
        )}
        {slide === 2 && <SlideCLI onNext={next} onSkip={() => finish(createdId)} />}
        {slide === 3 && <SlideDone createdId={createdId} onFinish={finish} />}
      </div>

      {slide > 0 && (
        <button
          onClick={() => finish(createdId)}
          className="mt-8 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip and go to dashboard
        </button>
      )}
    </div>
  )
}

// ── Slide 0 — Welcome ────────────────────────────────────────────────────────

function SlideIntro({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center shadow-[0_0_40px_oklch(0.65_0.18_142/0.15)]">
          <Terminal className="h-7 w-7 text-primary" />
        </div>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight mb-3">
        Welcome to <span className="font-mono text-primary">dotkey</span>
      </h1>
      <p className="text-muted-foreground text-sm leading-relaxed mb-10 max-w-md mx-auto">
        The end of <span className="font-mono text-foreground">&quot;send me your .env bro&quot;</span>.
        Manage environment variables for every project, environment, and teammate — from one place.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
          { icon: Shield, label: "Encrypted", desc: "AES-256-GCM at rest" },
          { icon: Users,  label: "Team roles", desc: "Owner · Admin · Developer · Read-only" },
          { icon: Zap,    label: "CLI first",  desc: "dotkey pull · push · diff" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4 text-left">
            <Icon className="h-4 w-4 text-primary mb-2" />
            <p className="text-xs font-medium mb-0.5">{label}</p>
            <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button className="gap-2 btn-glow" onClick={onNext}>
          Get started <ArrowRight className="h-4 w-4" />
        </Button>
        <button onClick={onSkip} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Skip intro
        </button>
      </div>
    </div>
  )
}

// ── Slide 1 — Create project ─────────────────────────────────────────────────

function SlideProject({
  value, onChange, onSubmit, loading, onSkip
}: {
  value: string; onChange: (v: string) => void
  onSubmit: () => void; loading: boolean; onSkip: () => void
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-6">Step 1 of 3</p>
      <h2 className="text-xl font-semibold mb-2">Name your first project</h2>
      <p className="text-sm text-muted-foreground mb-8">
        This usually matches your repository or service name. You can create more later.
      </p>

      <form onSubmit={e => { e.preventDefault(); onSubmit() }} className="space-y-4">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="my-api-service"
          className="h-11 text-base bg-input border-border font-mono"
          autoFocus
        />
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={!value.trim() || loading}
            className="flex-1 gap-2 btn-glow"
          >
            {loading ? "Creating…" : "Create project"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="outline" className="border-border" onClick={onSkip}>
            Skip
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── Slide 2 — Install CLI ────────────────────────────────────────────────────

function SlideCLI({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-6">Step 2 of 3</p>
      <h2 className="text-xl font-semibold mb-2">Install the CLI</h2>
      <p className="text-sm text-muted-foreground mb-8">
        The <span className="font-mono text-foreground">dotkey</span> CLI lets you pull and push secrets
        directly from your terminal — no browser needed for day-to-day work.
      </p>

      <div className="space-y-3 mb-8">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">macOS / Linux</p>
        <CodeBlock code="curl -fsSL install.envx.io | sh" />

        <p className="text-xs text-muted-foreground uppercase tracking-wider pt-2">Build from source</p>
        <CodeBlock code="go install github.com/envx/cli@latest" />
      </div>

      <div className="flex gap-3">
        <Button className="flex-1 gap-2 btn-glow" onClick={onNext}>
          I&apos;ve installed it <ArrowRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="border-border" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  )
}

// ── Slide 3 — Done ───────────────────────────────────────────────────────────

function SlideDone({ createdId, onFinish }: { createdId: string; onFinish: (id?: string) => void }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-6">Step 3 of 3</p>
      <h2 className="text-xl font-semibold mb-2">Log in and pull your secrets</h2>
      <p className="text-sm text-muted-foreground mb-8">
        Run these commands in your project directory to authenticate and pull secrets to a local{" "}
        <span className="font-mono text-foreground">.env</span> file.
      </p>

      <div className="terminal p-4 space-y-2 mb-8">
        {[
          { cmd: "dotkey login", note: "opens browser for 2FA auth" },
          { cmd: "dotkey project use my-api-service", note: "" },
          { cmd: "dotkey env use development", note: "" },
          { cmd: "dotkey pull", note: "writes .env to current directory" },
        ].map(({ cmd, note }) => (
          <div key={cmd}>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm font-mono">$</span>
              <span className="text-sm font-mono text-foreground">{cmd}</span>
            </div>
            {note && (
              <p className="text-xs text-muted-foreground ml-4 mt-0.5"># {note}</p>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <Check className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-mono text-primary">Written to .env</span>
        </div>
      </div>

      <Button
        className="w-full gap-2 btn-glow"
        onClick={() => onFinish(createdId || undefined)}
      >
        Go to Dashboard <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
