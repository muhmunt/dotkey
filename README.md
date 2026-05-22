# dotkey

> Stop sharing `.env` files over Slack.

**dotkey** is an open-source, self-hosted environment variable manager for developers and teams. Manage secrets for every project and environment from one place — with a web dashboard, REST API, and a fast CLI.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?logo=go)](go.mod)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](web/package.json)

---

## Features

- **AES-256-GCM** encryption for all secrets at rest
- **Team roles** — owner · admin · developer · read-only
- **CLI** — `dotkey pull` / `push` / `diff` / `rollback`
- **2FA with TOTP** — Google Authenticator, Authy, 1Password
- **Reveal lock** — 2FA code required to view secret values
- **CI/CD tokens** — non-expiring project-scoped tokens for pipelines
- **Version history** — every change recorded, one-click rollback
- **Environment lock** — prevent accidental writes to production
- **Activity feed** — project-wide audit trail
- **Global search** — `⌘K` across all projects and variables
- **Integrations** — GitHub Actions, Docker, Vercel, Railway, direnv

---

## Quick start (Docker)

```bash
git clone https://github.com/muhmunt/dotkey
cd dotkey
cp .env.example .env
# Set JWT_SECRET and ENCRYPTION_KEY in .env
docker-compose up -d
```

Open **http://localhost:3000** and register your first account.

---

## CLI

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/muhmunt/dotkey-cli/main/install.sh | sh

# With Go
go install github.com/muhmunt/dotkey-cli@latest
```

```bash
dotkey login          # authenticate via browser
dotkey pull production   # write .env to current directory
dotkey push staging      # push local .env to server
dotkey diff dev prod     # compare two environments
```

---

## Architecture

| Component | Tech |
|-----------|------|
| Backend API | Go · Gin · GORM · PostgreSQL |
| Dashboard | Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui |
| CLI | Go · Cobra |
| Encryption | AES-256-GCM (unique nonce per value) |
| Auth | JWT (24h) · TOTP 2FA (RFC 6238) |

---

## Repository structure

```
dotkey/
├── cmd/           Go backend entry point
├── internal/      Business logic packages
├── models/        GORM models
├── api/           HTTP routes
├── db/            Database initialisation
├── pkg/           Shared utilities (crypto)
├── config/        Configuration
├── web/           Next.js dashboard
├── docs-site/     MkDocs documentation
├── Dockerfile     Backend container
└── docker-compose.yml
```

The CLI lives in a separate repo: [muhmunt/dotkey-cli](https://github.com/muhmunt/dotkey-cli)

---

## Self-hosting

See the [self-hosting guide](docs-site/docs/self-hosting/docker.md) for Docker Compose,
bare-metal, and reverse proxy (Nginx / Caddy) setup.

**Required environment variables:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random 32+ character string |
| `ENCRYPTION_KEY` | Exactly 32 characters |
| `ALLOWED_ORIGINS` | Dashboard URL (e.g. `http://localhost:3000`) |

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup,
coding conventions, and the PR process.

---

## Security

Found a vulnerability? Please email **security@dotkey.io** instead of opening a public issue.
See [SECURITY.md](SECURITY.md) for the full policy.

---

## License

[MIT](LICENSE) © Muhammad Muntasir
