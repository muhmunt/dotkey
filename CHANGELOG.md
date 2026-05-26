# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-05-26

### Added
- `.env` value-level encryption (Pattern A) — `tools/envenc` (`dotkey-enc`) binary; server auto-decrypts `encrypted:v1:…` values at startup when `DOTKEY_MASTER_KEY` is set
- CLI auth token encrypted at rest in `~/.dotkey/config.yaml` via a per-machine key (`~/.dotkey/key`, 0600)
- 2FA backup codes — 8 one-time codes generated on 2FA setup; use `POST /auth/login/backup-code` to log in if authenticator is lost; regenerate from Settings with TOTP confirmation
- Webhook delivery log — last 25 deliveries per webhook recorded with HTTP status and error; `GET /projects/:id/webhooks/:wid/deliveries`
- Security audit log — key events (login, export, password change, 2FA enable/disable) logged to `audit_logs`; `GET /auth/audit-log` returns own history
- Security headers on every API response (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`)
- SSRF protection on webhook URLs — private/loopback/link-local IPs rejected at creation time
- Webhook secrets encrypted at rest with AES-256-GCM (same key as variable values)
- Rate limiting on `GET /users/search` — 10 requests per minute per IP
- Mandatory 2FA onboarding — new users redirected to `/setup-2fa` until setup is complete
- JWT refresh tokens — sessions silently refresh when fewer than 1 hour remains
- JWT revocation blocklist — logout invalidates token server-side (JTI blocklist, expired entries purged every 10 min)
- Load-more pagination on Activity and History pages (offset-based, 50 entries per page)
- Rate limiting on all auth endpoints — 10 requests per 15 minutes per IP
- Change display name inline in Settings
- Change password from Settings with current-password verification
- Forgot password / password reset — verified via authenticator app (TOTP), no SMTP required
- Delete account — requires password confirmation, blocked if sole owner of any project
- Environment clone — copy all variables from one environment to another
- Variable bulk delete — select multiple variables and delete in one action
- Key validation on variable add — no spaces, valid identifier format, duplicate detection
- Inline field errors across all forms
- Webhooks — per-project HTTP webhooks with HMAC-SHA256 signatures

### Fixed
- `ENCRYPTION_KEY` shorter than 32 bytes now causes a fatal startup error instead of silently zero-padding (weakened AES-256)
- Account enumeration via `POST /forgot-password` — response is now identical whether or not the email exists; state token stored server-side, only an opaque `request_id` returned
- Docker Compose `NEXT_PUBLIC_API_URL` now correctly passed as a build-time arg
- Removed duplicate ad-hoc rate limiter in `main.go`

### Upgrade notes (0.1.0 → 0.2.0)
- **`ENCRYPTION_KEY` must be exactly 32 bytes.** The server will refuse to start otherwise. Generate with `openssl rand -hex 16`.
- **Webhook secrets are now encrypted in the database.** Existing webhooks will fail HMAC verification after upgrade — delete and recreate them. The new secret is shown once at creation.

## [0.1.0] - 2026-05-22

### Added
- Backend API: auth (JWT + TOTP 2FA + device flow), projects, environments, variables, history, rollback
- AES-256-GCM encryption for all secret values at rest
- Team management: owner / admin / developer / read-only roles
- Environment lock to prevent accidental production edits
- CI/CD project tokens (non-expiring, SHA-256 hashed)
- Activity feed — project-wide audit log
- Global search across projects and variable keys (⌘K)
- Reveal lock — 2FA code required to view secret values
- Variable diff between environments
- Next.js 14 dashboard with full feature parity
- CLI tool (`dotkey`) — pull, push, diff, history, rollback, sync
- Self-hosting via Docker Compose
- MkDocs Material documentation site
- In-app keyboard shortcuts (?)
