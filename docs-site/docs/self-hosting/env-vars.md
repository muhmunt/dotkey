# Environment Variables

All variables are set in the `.env` file at the repo root.

!!! tip "Encrypt your .env in production"
    Sensitive values (`JWT_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`) can be
    encrypted in-place so a leaked `.env` file is useless without the master key.
    See [.env Encryption](env-encryption.md) for the full guide.

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/dotkey?sslmode=disable` |
| `JWT_SECRET` | Secret for signing JWTs — 32+ random chars | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | AES-256 key — must be exactly 32 characters | `openssl rand -hex 16` |

## Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | API server port |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS allowed origins |
| `DB_PASSWORD` | `dotkey` | Postgres password (Docker Compose only) |
| `API_URL` | `http://localhost:8080` | API URL shown to the dashboard container |

## SMTP (optional — for future notifications)

Password reset does **not** use email — it uses your authenticator app (TOTP). SMTP variables are reserved for future notification features and can be left unset.

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | _(unset)_ | SMTP server hostname — leave unset to disable email |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | _(unset)_ | SMTP username |
| `SMTP_PASSWORD` | _(unset)_ | SMTP password |
| `SMTP_FROM` | `noreply@dotkey.app` | From address for outgoing emails |
| `APP_URL` | `http://localhost:3000` | Base URL of the dashboard — used in password-reset links |

## Dashboard build-time variables

The Next.js dashboard has one additional variable that must be set **before building the image**:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Public URL of the API, baked into the dashboard bundle at build time |

Pass it as a Docker build arg:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t dotkey-web ./web
```

When using Docker Compose, set it under `build.args` in `docker-compose.yml` (already configured by default) — updating it in `.env` and rebuilding is sufficient.

## Secret rotation { #secret-rotation }

| Secret | Effect of changing | Migration path |
|--------|--------------------|----------------|
| `ENCRYPTION_KEY` | All stored variable values become **permanently unreadable** | Re-export all variables before changing, re-import after |
| `JWT_SECRET` | All active user sessions are **immediately invalidated** | Users must log in again; safe to rotate at any time |
| `NEXT_PUBLIC_API_URL` | No effect until the `web` image is rebuilt | `docker-compose build web && docker-compose up -d web` |
| `DOTKEY_MASTER_KEY` | Encrypted `.env` cannot be read by the server | See [key rotation](env-encryption.md#key-rotation) |

!!! danger
    There is no migration tool for `ENCRYPTION_KEY` rotation. Export all environment
    variables to plaintext before changing the key, then re-import after.
