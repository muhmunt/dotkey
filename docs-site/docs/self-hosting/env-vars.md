# Environment Variables

All variables are set in the `.env` file at the repo root.

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

!!! warning "Secret rotation"
    Changing `ENCRYPTION_KEY` will make all existing secrets unreadable.
    Changing `JWT_SECRET` will invalidate all active sessions.
