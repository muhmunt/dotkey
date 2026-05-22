# Contributing to dotkey

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be respectful and welcoming.

## Ways to contribute

- **Bug reports** — open a [GitHub issue](https://github.com/muhmunt/dotkey/issues/new?template=bug_report.md)
- **Feature requests** — open a [GitHub issue](https://github.com/muhmunt/dotkey/issues/new?template=feature_request.md)
- **Documentation** — improve any page in `docs-site/docs/`
- **Code** — pick an open issue and submit a PR

## Development setup

### Prerequisites

- Go 1.22+
- Node.js 20+
- PostgreSQL 14+ (or Docker)
- Git

### Clone and configure

```bash
git clone https://github.com/muhmunt/dotkey
cd dotkey
cp .env.example .env
# Edit .env — fill in DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY
```

### Run the backend

```bash
go run ./cmd
# API running at http://localhost:8080
```

### Run the dashboard

```bash
cd web
npm install
npm run dev
# Dashboard at http://localhost:3000
```

### Run the CLI (development)

```bash
cd ../dotkey-cli   # separate repo
go run . --help
```

## Project structure

```
cmd/              Backend entry point (main.go)
internal/
  auth/           JWT, TOTP 2FA, device flow
  project/        Project CRUD + team membership
  environment/    Environment CRUD + lock
  variable/       AES-256-GCM secrets, export/import, diff
  version/        Version history + rollback
  activity/       Audit log
  token/          CI/CD project tokens
  search/         Global search
  user/           User lookup
  ratelimit/      Login rate limiting
models/           GORM models (User, Project, Environment, Variable...)
api/              Route registration
db/               PostgreSQL connection + migrations
pkg/crypto/       AES-256-GCM encrypt/decrypt
config/           Environment variable config
web/              Next.js 14 dashboard
docs-site/        MkDocs Material documentation
```

## Pull request process

1. Fork the repository
2. Create a branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Ensure the build passes: `go build ./...` and `cd web && npm run build`
5. Commit with a conventional message (see below)
6. Push and open a PR against `main`

## Commit conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add environment lock toggle
fix: prevent nil pointer in token middleware
docs: add self-hosting nginx guide
chore: upgrade Go to 1.23
refactor: simplify activity feed SQL query
```

## Running tests

```bash
# Backend
go test ./...

# Dashboard type check
cd web && npx tsc --noEmit
```
