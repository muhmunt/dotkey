# API Tokens

Project tokens are non-expiring, project-scoped credentials for use in CI/CD pipelines. Unlike personal JWTs, they:

- **Never expire**
- Are scoped to a single project
- Can be revoked at any time
- Don't require 2FA to pull secrets (safe for automation)

## Create a token

1. Go to **Project → Tokens**
2. Click **+ New Token**
3. Give it a name (e.g. `github-deploy`)
4. Choose permissions:
   - **Read-only** — can pull secrets
   - **Read + write** — can pull and push
5. Click **Generate Token**

!!! warning
    **Copy the token immediately.** It is shown only once and cannot be retrieved again.

## Using a token in GitHub Actions

Add the token to your GitHub repository secrets as `DOTKEY_TOKEN`, then:

```yaml
- name: Pull environment variables
  run: dotkey pull production
  env:
    DOTKEY_TOKEN: ${{ secrets.DOTKEY_TOKEN }}
    DOTKEY_API_URL: https://your-dotkey-instance.com
```

## Using a token with the CLI

```bash
DOTKEY_TOKEN=dotkey_tok_abc123... dotkey pull production
```

Or set it in your shell profile:

```bash
export DOTKEY_TOKEN=dotkey_tok_abc123...
dotkey pull production
```

## Revoke a token

Click the **🗑** icon next to the token in the Tokens list. Revocation is immediate.

## Token format

Tokens look like:

```
dotkey_tok_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

Only the first 16 characters (`dotkey_tok_XXXXXXXX`) are shown in the list for identification.
