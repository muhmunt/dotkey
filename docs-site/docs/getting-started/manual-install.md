# Manual Installation

If you prefer not to use Docker, you can run each component directly.

## Prerequisites

| Tool | Version |
|------|---------|
| Go | 1.22+ |
| Node.js | 20+ |
| PostgreSQL | 14+ |

## 1. Clone the repository

```bash
git clone https://github.com/muhmunt/dotkey
cd dotkey
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY
```

## 2. Start the backend

```bash
go run ./cmd
# API running at http://localhost:8080
```

The backend auto-migrates the database on startup. No SQL files to run manually.

## 3. Start the dashboard

```bash
cd web
npm install
npm run dev
# Dashboard at http://localhost:3000
```

## 4. Install the CLI

```bash
cd ../dotkey-cli   # separate repo
go build -o dotkey .
sudo cp dotkey /usr/local/bin/dotkey
```

Or install from GitHub releases:

```bash
curl -fsSL https://raw.githubusercontent.com/muhmunt/dotkey-cli/main/install.sh | sh
```

## Environment variables

See [Environment Variables](../self-hosting/env-vars.md) for all configuration options.
