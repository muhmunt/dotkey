# Self-Hosting with Docker Compose

## Prerequisites

- Docker 24+
- Docker Compose v2

## Setup

```bash
git clone https://github.com/muhmunt/dotkey
cd dotkey
cp .env.example .env
```

Edit `.env`:

```bash
# Generate a random 32+ char secret
JWT_SECRET=$(openssl rand -hex 32)

# Must be exactly 32 characters
ENCRYPTION_KEY=$(openssl rand -hex 16)

# Optional: restrict CORS to your domain
ALLOWED_ORIGINS=https://app.example.com
```

## Start

```bash
docker-compose up -d
```

Services started:

| Service | Port | Description |
|---------|------|-------------|
| `db` | internal | PostgreSQL 16 |
| `api` | 8080 | dotkey backend API |
| `web` | 3000 | Next.js dashboard |

## Access

- Dashboard: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8080](http://localhost:8080)
- Health: [http://localhost:8080/health](http://localhost:8080/health)

## Stop

```bash
docker-compose down          # stop, keep data
docker-compose down -v       # stop, delete all data
```

## Upgrade

```bash
git pull
docker-compose build
docker-compose up -d
```

## Production notes

- Place the API and dashboard behind a reverse proxy (Nginx / Caddy) with HTTPS
- Set `ALLOWED_ORIGINS` to your actual dashboard domain
- Use a managed PostgreSQL instance for durability
- Back up `postgres_data` Docker volume regularly
