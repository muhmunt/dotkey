# Architecture

## Overview

```
Browser / CLI
      │
      ▼
  Backend API (Go · Gin · :8080)
      │
      ▼
  PostgreSQL
```

## Backend packages

| Package | Responsibility |
|---------|---------------|
| `internal/auth` | JWT, TOTP 2FA, device flow, reveal tokens |
| `internal/project` | Project CRUD, team membership, RBAC |
| `internal/environment` | Environment CRUD, lock toggle |
| `internal/variable` | AES-256-GCM secrets, export/import, diff |
| `internal/version` | Change history, rollback |
| `internal/activity` | Audit log (project-wide) |
| `internal/token` | CI/CD project tokens |
| `internal/search` | Full-text search across projects and keys |
| `internal/ratelimit` | Login rate limiting |
| `pkg/crypto` | AES-256-GCM encrypt/decrypt |

## Layered architecture

Each domain follows: `repository → service → handler`

```
handler.go     HTTP — parses request, calls service, writes response
service.go     Business logic — RBAC checks, orchestration
repository.go  Database — GORM queries only
```

Cross-package dependencies use Go interfaces to avoid import cycles:

```go
// variable/service.go
type EnvAccess interface {
    GetByID(projectID, envID, userID string) (*models.Environment, error)
}
type ProjectAccess interface {
    GetMemberRole(projectID, userID string) (string, error)
}
```

## Dashboard

Next.js 14 App Router. Key patterns:

- `lib/api.ts` — typed HTTP client, all API calls go through here
- `context/reveal-context.tsx` — React state for 2FA reveal session (never localStorage)
- `components/search/command-palette.tsx` — ⌘K global search overlay
- Route group: `app/projects/[id]/` — all project pages share a layout with the env sub-nav
