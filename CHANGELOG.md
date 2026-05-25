# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `.env` value-level encryption (Pattern A) — `tools/envenc` (`dotkey-enc`) binary to encrypt/decrypt sensitive values in `.env` using AES-256-GCM; server auto-decrypts at startup when `DOTKEY_MASTER_KEY` is set
- CLI auth token encrypted at rest in `~/.dotkey/config.yaml` using a per-machine key (`~/.dotkey/key`, mode 0600)
- Mandatory 2FA onboarding — new users are redirected to `/setup-2fa` immediately after registration and cannot access the dashboard until setup is complete
- JWT refresh tokens — sessions silently refresh when fewer than 1 hour remains, preventing unexpected logouts
- JWT revocation blocklist — logout invalidates the token server-side (DB-backed JTI blocklist, expired entries purged every 10 min)
- Load-more pagination on the Activity and History pages (offset-based, 50 entries per page)
- Rate limiting on auth endpoints — 10 requests per 15 minutes per IP (register, login, 2FA, reveal unlock, forgot/reset password)
- Change display name inline in Settings
- Change password from Settings with current-password verification
- Forgot password / password reset flow — verifies identity via authenticator app (TOTP), no SMTP required
- Delete account — requires password confirmation, blocks if sole owner of any project
- Environment clone — copy all variables from one environment to another (one click in the sidebar)
- Variable bulk delete — select multiple variables and delete in one action
- Key validation on variable add — no spaces, valid identifier format, duplicate detection
- Inline field errors across all forms (register, login, new project, new environment, settings)
- Webhooks — per-project HTTP webhooks with HMAC-SHA256 signatures for `variable.created`, `variable.updated`, `variable.deleted` events

### Fixed
- Docker Compose `NEXT_PUBLIC_API_URL` now correctly passed as a build-time arg so custom API domains are baked into the dashboard bundle
- Welcome page CLI install command and repository URLs updated to correct dotkey references
- Removed duplicate ad-hoc rate limiter in `main.go` (replaced by middleware in routes)

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
