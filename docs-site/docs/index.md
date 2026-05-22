# dotkey

> Stop sharing `.env` files over Slack.

**dotkey** is an open-source, self-hosted environment variable manager for developers and teams.

## Features

- **AES-256-GCM** encryption for all secrets at rest
- **Team roles** — owner · admin · developer · read-only
- **CLI** — `dotkey pull` / `push` / `diff` / `rollback`
- **2FA** — Google Authenticator, Authy, 1Password
- **Reveal lock** — 2FA required to view secret values
- **CI/CD tokens** — non-expiring, project-scoped
- **Version history** with one-click rollback
- **Environment lock** — prevent accidental production edits

## Quick start

```bash
git clone https://github.com/muhmunt/dotkey
cd dotkey
cp .env.example .env
docker-compose up -d
```

Open **http://localhost:3000** → register → start managing secrets.

[Get started →](getting-started/index.md){ .md-button .md-button--primary }
[Self-hosting guide →](self-hosting/docker.md){ .md-button }
