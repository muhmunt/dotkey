# GitHub Actions

Pull secrets from dotkey into your CI/CD pipeline using a project token.

## Setup

1. Go to **Project → Tokens** in the dashboard
2. Click **+ New Token** → name it `github-actions` → **Read-only** → **Generate**
3. Copy the token (shown once only)
4. Go to your GitHub repository → **Settings → Secrets and variables → Actions**
5. Add a new secret: `DOTKEY_TOKEN` = your token

## Basic workflow step

```yaml
- name: Pull environment variables
  run: |
    curl -fsSL https://raw.githubusercontent.com/muhmunt/dotkey-cli/main/install.sh | sh
    dotkey pull ${{ env.ENVIRONMENT }}
  env:
    DOTKEY_TOKEN: ${{ secrets.DOTKEY_TOKEN }}
    DOTKEY_API_URL: https://your-dotkey-instance.com
    ENVIRONMENT: production
```

## Full workflow example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dotkey CLI
        run: curl -fsSL https://raw.githubusercontent.com/muhmunt/dotkey-cli/main/install.sh | sh

      - name: Pull production secrets
        run: dotkey pull production --project my-service
        env:
          DOTKEY_TOKEN: ${{ secrets.DOTKEY_TOKEN }}
          DOTKEY_API_URL: https://your-dotkey-instance.com

      - name: Build and deploy
        run: |
          source .env
          # your build commands here
```

## Per-environment deployments

```yaml
- name: Pull secrets for ${{ matrix.env }}
  run: dotkey pull ${{ matrix.env }} --project my-service
  env:
    DOTKEY_TOKEN: ${{ secrets.DOTKEY_TOKEN }}
    DOTKEY_API_URL: https://your-dotkey-instance.com
```

## Tips

- Use **read-only** tokens for pull-only pipelines
- Use **read + write** tokens if the pipeline also needs to push secrets
- Create separate tokens per workflow so you can revoke them independently
