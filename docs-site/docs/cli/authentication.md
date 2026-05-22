# CLI Authentication

## Login (device flow)

```bash
dotkey login
```

This starts a browser-based authentication flow:

1. The CLI prints a code like `ABCD-EF23` and opens your browser
2. Visit the `/activate` page and enter the code
3. Your browser session is used to approve the device
4. The CLI receives a token and stores it in `~/.dotkey/config.yaml`

This means **your password never passes through the terminal**.

## Check who you're logged in as

```bash
dotkey whoami
```

## Logout

```bash
dotkey logout
```

Removes the token from `~/.dotkey/config.yaml`.

## CI / non-interactive environments

For pipelines and scripts, use a **project token** instead of personal login:

```bash
# set via environment variable
export DOTKEY_TOKEN=dotkey_tok_abc123...
dotkey pull production

# or pass inline
DOTKEY_TOKEN=dotkey_tok_abc123... dotkey pull production

# or pass as flag
dotkey pull production --token dotkey_tok_abc123...
```

Generate project tokens from **Project → Tokens** in the dashboard.

## Connecting to a custom instance

If you're self-hosting, point the CLI at your server:

```bash
dotkey login --api https://api.example.com --web https://app.example.com
```

Or set permanently in `~/.dotkey/config.yaml`:

```yaml
api_url: https://api.example.com
web_url: https://app.example.com
```

## Per-project context (.dotkey file)

Create a `.dotkey` file in your project root to automatically set the project and environment:

```yaml
# .dotkey — safe to commit, contains no secrets
project: my-service
environment: development
```

With this file, `dotkey pull` works without specifying the project or environment every time.
