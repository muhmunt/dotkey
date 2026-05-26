"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/api"
import { clearToken } from "@/lib/auth"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDate } from "@/lib/utils"
import { Shield, ShieldOff, ShieldCheck, Smartphone, Pencil, Check, X, Copy, Download, RefreshCw } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import QRCode from "react-qr-code"

export default function SettingsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: user, refetch } = useQuery({ queryKey: ["me"], queryFn: auth.me })

  // name edit
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState("")
  const [nameSaving, setNameSaving] = useState(false)

  // change password
  const [showPassword, setShowPassword] = useState(false)
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({})
  const [pwSaving, setPwSaving] = useState(false)

  // delete account
  const [showDelete, setShowDelete] = useState(false)
  const [deletePw, setDeletePw] = useState("")
  const [deletePwError, setDeletePwError] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!deletePw) { setDeletePwError("Password is required"); return }
    setDeletePwError("")
    setDeleteLoading(true)
    try {
      await auth.deleteMe(deletePw)
      clearToken()
      router.push("/register")
    } catch (err: any) {
      setDeletePwError(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  // 2FA setup state
  const [qrURL, setQrURL] = useState("")
  const [setupStep, setSetupStep] = useState<"idle" | "scan" | "confirm" | "codes">("idle")
  const [confirmCode, setConfirmCode] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [showDisable, setShowDisable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [setupCodes, setSetupCodes] = useState<string[]>([])

  // backup codes section
  const [showRegenForm, setShowRegenForm] = useState(false)
  const [regenCode, setRegenCode] = useState("")
  const [regenCodes, setRegenCodes] = useState<string[]>([])

  const { data: backupCodeData, refetch: refetchCount } = useQuery({
    queryKey: ["backupCodeCount"],
    queryFn: auth.backupCodeCount,
    enabled: user?.totp_enabled ?? false,
  })

  async function saveName() {
    if (!nameValue.trim()) return
    setNameSaving(true)
    try {
      await auth.updateMe(nameValue.trim())
      refetch(); qc.invalidateQueries({ queryKey: ["me"] })
      setEditingName(false)
      toast.success("Name updated")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setNameSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!currentPw) errs.current = "Current password is required"
    if (newPw.length < 8) errs.new = "New password must be at least 8 characters"
    if (!confirmPw) errs.confirm = "Please confirm your new password"
    else if (newPw !== confirmPw) errs.confirm = "Passwords do not match"
    if (Object.keys(errs).length) { setPwErrors(errs); return }
    setPwErrors({})
    setPwSaving(true)
    try {
      await auth.changePassword(currentPw, newPw)
      setShowPassword(false); setCurrentPw(""); setNewPw(""); setConfirmPw("")
      toast.success("Password updated")
    } catch (err: any) {
      setPwErrors({ current: err.message })
    } finally {
      setPwSaving(false)
    }
  }

  async function startSetup() {
    setLoading(true)
    try {
      const { qr_url } = await auth.setup2fa()
      setQrURL(qr_url)
      setSetupStep("scan")
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
      const { backup_codes } = await auth.confirm2fa(confirmCode)
      setSetupCodes(backup_codes)
      setSetupStep("codes")
      setQrURL("")
      setConfirmCode("")
      refetch()
      qc.invalidateQueries({ queryKey: ["me"] })
    } catch (err: any) {
      toast.error(err.message)
      setConfirmCode("")
    } finally {
      setLoading(false)
    }
  }

  function copyAllCodes(codes: string[]) {
    navigator.clipboard.writeText(codes.join("\n"))
    toast.success("Backup codes copied")
  }

  function downloadCodes(codes: string[]) {
    const blob = new Blob([codes.join("\n")], { type: "text/plain" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "dotkey-backup-codes.txt"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function handleRegen(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { backup_codes } = await auth.regenerateBackupCodes(regenCode)
      setRegenCodes(backup_codes)
      setShowRegenForm(false)
      setRegenCode("")
      refetchCount()
    } catch (err: any) {
      toast.error(err.message)
      setRegenCode("")
    } finally {
      setLoading(false)
    }
  }

  async function disable2FA(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await auth.disable2fa(disableCode)
      toast.success("2FA disabled")
      setShowDisable(false)
      setDisableCode("")
      refetch()
      qc.invalidateQueries({ queryKey: ["me"] })
    } catch (err: any) {
      toast.error(err.message)
      setDisableCode("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="p-6 max-w-md space-y-5">
        <h1 className="text-sm font-medium">Settings</h1>

        {/* account */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-card/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account</p>
          </div>
          {/* name row — editable */}
          <div className="flex items-center px-4 py-3 border-b border-border">
            <span className="text-xs text-muted-foreground w-28">Name</span>
            {editingName ? (
              <div className="flex items-center gap-1.5 flex-1">
                <Input
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  className="h-7 text-xs bg-input border-border"
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false) }}
                />
                <button onClick={saveName} disabled={nameSaving} className="text-primary hover:text-primary/80 transition-colors">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setEditingName(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group flex-1">
                <span className="text-xs font-mono">{user?.name ?? "—"}</span>
                <button
                  onClick={() => { setNameValue(user?.name ?? ""); setEditingName(true) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          {[
            { label: "Email",        value: user?.email },
            { label: "User ID",      value: user?.id },
            { label: "Member since", value: user?.created_at ? formatDate(user.created_at) : undefined },
          ].map(row => (
            <div key={row.label} className="flex items-center px-4 py-3 border-b border-border last:border-0">
              <span className="text-xs text-muted-foreground w-28">{row.label}</span>
              <span className="text-xs font-mono">{row.value ?? "—"}</span>
            </div>
          ))}
        </div>

        {/* change password */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-card/50 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</p>
            {!showPassword && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowPassword(true)}>
                Change
              </Button>
            )}
          </div>
          <div className="p-4">
            {!showPassword ? (
              <p className="text-xs text-muted-foreground">••••••••••••</p>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Current password</Label>
                  <Input
                    type="password" value={currentPw}
                    onChange={e => { setCurrentPw(e.target.value); pwErrors.current && setPwErrors(p => ({ ...p, current: "" })) }}
                    className={cn("h-8 text-sm bg-input border-border", pwErrors.current && "border-destructive")}
                    autoFocus
                  />
                  {pwErrors.current && <p className="text-xs text-destructive">{pwErrors.current}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">New password</Label>
                  <Input
                    type="password" value={newPw}
                    onChange={e => { setNewPw(e.target.value); pwErrors.new && setPwErrors(p => ({ ...p, new: "" })) }}
                    placeholder="min. 8 characters"
                    className={cn("h-8 text-sm bg-input border-border", pwErrors.new && "border-destructive")}
                  />
                  {pwErrors.new && <p className="text-xs text-destructive">{pwErrors.new}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Confirm new password</Label>
                  <Input
                    type="password" value={confirmPw}
                    onChange={e => { setConfirmPw(e.target.value); pwErrors.confirm && setPwErrors(p => ({ ...p, confirm: "" })) }}
                    placeholder="repeat new password"
                    className={cn("h-8 text-sm bg-input border-border", pwErrors.confirm && "border-destructive")}
                  />
                  {pwErrors.confirm && <p className="text-xs text-destructive">{pwErrors.confirm}</p>}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm" className="h-7 text-xs" disabled={pwSaving}>
                    {pwSaving ? "Saving…" : "Update password"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => { setShowPassword(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); setPwErrors({}) }}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* 2FA */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-card/50 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Two-Factor Authentication
            </p>
            {user?.totp_enabled && (
              <span className="ml-auto flex items-center gap-1 text-xs text-primary">
                <ShieldCheck className="h-3 w-3" /> Enabled
              </span>
            )}
          </div>

          <div className="p-4">
            {user?.totp_enabled && setupStep !== "codes" ? (
              // 2FA is enabled — show status + disable option
              <>
                <p className="text-xs text-muted-foreground mb-4">
                  Your account and secret reveals are protected with an authenticator app.
                  Every time you want to view a secret value, you&apos;ll need to enter a 6-digit code.
                </p>

                {!showDisable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-border text-destructive hover:text-destructive gap-1.5"
                    onClick={() => setShowDisable(true)}
                  >
                    <ShieldOff className="h-3 w-3" /> Disable 2FA
                  </Button>
                ) : (
                  <form onSubmit={disable2FA} className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Enter your current authenticator code to confirm:
                    </p>
                    <Input
                      value={disableCode}
                      onChange={e => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000 000"
                      className="h-10 text-center font-mono text-lg tracking-[0.4em] bg-input border-border"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={disableCode.length < 6 || loading}
                      >
                        {loading ? "Disabling…" : "Confirm Disable"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setShowDisable(false); setDisableCode("") }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </>
            ) : setupStep === "codes" ? (
              // show backup codes after enabling 2FA
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  2FA enabled. Store these backup codes somewhere safe — each works once if you lose your authenticator app.
                </p>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {setupCodes.map(c => (
                    <code key={c} className="text-xs font-mono px-2 py-1.5 rounded bg-input border border-border text-center tracking-wider">
                      {c}
                    </code>
                  ))}
                </div>
                <div className="flex gap-2 mb-3">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 flex-1" onClick={() => copyAllCodes(setupCodes)}>
                    <Copy className="h-3 w-3" /> Copy all
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 flex-1" onClick={() => downloadCodes(setupCodes)}>
                    <Download className="h-3 w-3" /> Download
                  </Button>
                </div>
                <Button size="sm" className="h-7 text-xs" onClick={() => { setSetupStep("idle"); setSetupCodes([]) }}>
                  Done
                </Button>
              </>
            ) : setupStep === "idle" ? (
              // 2FA not enabled — prompt to set up
              <>
                <p className="text-xs text-muted-foreground mb-4">
                  Add an extra layer of security. Once enabled, you&apos;ll need a
                  6-digit code from your authenticator app to log in and to reveal secret values.
                </p>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={startSetup}
                  disabled={loading}
                >
                  <Smartphone className="h-3 w-3" />
                  {loading ? "Generating…" : "Set up 2FA"}
                </Button>
              </>
            ) : setupStep === "scan" ? (
              // show QR code
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Scan this QR code with your authenticator app
                  (Google Authenticator, Authy, 1Password, etc.)
                </p>
                <div className="bg-white p-3 rounded-md inline-block">
                  <QRCode value={qrURL} size={160} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Can&apos;t scan? Copy the URL below into your app manually.
                </p>
                <code className="text-xs text-muted-foreground break-all block bg-input border border-border rounded px-2 py-1">
                  {qrURL}
                </code>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSetupStep("confirm")}
                >
                  I&apos;ve scanned it →
                </Button>
              </div>
            ) : (
              // confirm with first code
              <form onSubmit={confirmSetup} className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app to confirm setup:
                </p>
                <Input
                  value={confirmCode}
                  onChange={e => setConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000 000"
                  className="h-12 text-center font-mono text-xl tracking-[0.5em] bg-input border-border"
                  maxLength={6}
                  autoFocus
                  autoComplete="one-time-code"
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={confirmCode.length < 6 || loading}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    {loading ? "Verifying…" : "Enable 2FA"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setSetupStep("scan") }}
                  >
                    ← Back
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Backup codes */}
        {user?.totp_enabled && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-card/50 flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Backup Codes</p>
              {backupCodeData && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {backupCodeData.remaining} of 8 remaining
                </span>
              )}
            </div>
            <div className="p-4 space-y-3">
              {regenCodes.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">New backup codes generated. Store them somewhere safe.</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {regenCodes.map(c => (
                      <code key={c} className="text-xs font-mono px-2 py-1.5 rounded bg-input border border-border text-center tracking-wider">
                        {c}
                      </code>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 flex-1" onClick={() => copyAllCodes(regenCodes)}>
                      <Copy className="h-3 w-3" /> Copy all
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 flex-1" onClick={() => downloadCodes(regenCodes)}>
                      <Download className="h-3 w-3" /> Download
                    </Button>
                  </div>
                  <Button size="sm" className="h-7 text-xs" onClick={() => setRegenCodes([])}>Done</Button>
                </>
              ) : showRegenForm ? (
                <form onSubmit={handleRegen} className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Enter your authenticator code to replace all existing backup codes:
                  </p>
                  <Input
                    value={regenCode}
                    onChange={e => setRegenCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000 000"
                    className="h-10 text-center font-mono text-lg tracking-[0.4em] bg-input border-border"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" className="h-7 text-xs" disabled={regenCode.length < 6 || loading}>
                      {loading ? "Generating…" : "Generate new codes"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                      onClick={() => { setShowRegenForm(false); setRegenCode("") }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Use these if you lose access to your authenticator app. Regenerating invalidates all existing codes.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setShowRegenForm(true)}
                  >
                    <RefreshCw className="h-3 w-3" /> Regenerate codes
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* CLI */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-card/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CLI</p>
          </div>
          <div className="px-4 py-3 text-xs text-muted-foreground space-y-2">
            <p>Authenticate the CLI:</p>
            <code className="font-mono bg-input border border-border rounded px-2 py-1 text-foreground block">
              dotkey login
            </code>
            <p>
              Then enter the code shown on the{" "}
              <a href="/activate" className="text-primary underline">/activate</a> page.
            </p>
          </div>
        </div>

        {/* Keyboard shortcuts */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-card/50 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Keyboard Shortcuts</p>
            <kbd className="text-xs font-mono border border-border rounded px-1.5 py-0.5 text-muted-foreground">?</kbd>
          </div>
          <div className="px-4 py-3">
            <div className="space-y-2 text-xs">
              {[
                { keys: "⌘ K", desc: "Open global search" },
                { keys: "?", desc: "Open this shortcuts panel" },
                { keys: "Esc", desc: "Close any overlay" },
                { keys: "↑ ↓ + Enter", desc: "Navigate search results" },
              ].map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{desc}</span>
                  <kbd className="font-mono text-xs border border-border rounded px-1.5 py-0.5 text-foreground bg-input">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const e = new KeyboardEvent("keydown", { key: "?", bubbles: true })
                document.dispatchEvent(e)
              }}
              className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View all shortcuts →
            </button>
          </div>
        </div>

        {/* danger zone */}
        <div className="border border-destructive/30 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-destructive/30 bg-destructive/5">
            <p className="text-xs font-medium text-destructive uppercase tracking-wider">Danger zone</p>
          </div>
          <div className="p-4">
            {!showDelete ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Delete account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently remove your account. This cannot be undone.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 ml-4"
                  onClick={() => setShowDelete(true)}
                >
                  Delete account
                </Button>
              </div>
            ) : (
              <form onSubmit={handleDeleteAccount} className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Enter your password to confirm account deletion. This action is permanent.
                </p>
                <Input
                  type="password" value={deletePw}
                  onChange={e => { setDeletePw(e.target.value); deletePwError && setDeletePwError("") }}
                  placeholder="your current password"
                  className={cn("h-8 text-sm bg-input border-border", deletePwError && "border-destructive")}
                  autoFocus
                />
                {deletePwError && <p className="text-xs text-destructive">{deletePwError}</p>}
                <div className="flex gap-2">
                  <Button
                    type="submit" variant="destructive" size="sm"
                    className="h-7 text-xs" disabled={deleteLoading}
                  >
                    {deleteLoading ? "Deleting…" : "Permanently delete"}
                  </Button>
                  <Button
                    type="button" variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => { setShowDelete(false); setDeletePw(""); setDeletePwError("") }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
