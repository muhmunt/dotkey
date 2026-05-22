# Getting Started

dotkey has three components you can use together or independently:

| Component | Description |
|-----------|-------------|
| **Backend API** | Go server — manages projects, environments, and secrets |
| **Dashboard** | Next.js web app — visual interface for your team |
| **CLI** | `dotkey` binary — pull/push secrets from the terminal |

## Recommended: Docker Compose

The fastest way to run everything locally:

```bash
git clone https://github.com/muhmunt/dotkey
cd dotkey
cp .env.example .env
```

Edit `.env` and set three required values:

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY (must be exactly 32 chars)
openssl rand -hex 16
```

```bash
docker-compose up -d
```

Open [http://localhost:3000](http://localhost:3000) and register your account.

[Next: Quick Start →](quick-start.md)
