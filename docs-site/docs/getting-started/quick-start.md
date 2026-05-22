# Quick Start

## 1. Install the CLI

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/muhmunt/dotkey-cli/main/install.sh | sh

# With Go
go install github.com/muhmunt/dotkey-cli@latest
```

## 2. Log in

```bash
dotkey login
```

This opens your browser. Approve the device → your terminal receives a token automatically.

## 3. Create a project

In the dashboard, click **+ New Project** and give it a name.

## 4. Add environments

Click `+` next to **Environments** in the project sidebar. Create: `development`, `staging`, `production`.

## 5. Add variables

Click **+ Add** in the variable table:

```
DATABASE_URL = postgres://localhost/mydb
JWT_SECRET   = supersecret
```

## 6. Pull to your local project

```bash
cd ~/my-project
dotkey project use my-project
dotkey env use development
dotkey pull
# ✓ Written to .env
```

## 7. Push changes

```bash
echo "NEW_KEY=value" >> .env
dotkey push
# 1 variable synced to development
```
