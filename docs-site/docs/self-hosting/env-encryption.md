# .env Encryption

dotkey uses **Pattern A value-level encryption** for `.env` files: sensitive values are encrypted in-place while non-secret values (`PORT`, `ALLOWED_ORIGINS`) stay readable as plain text. The file is still a valid `.env` file — only the values change.

```bash
# Before encryption
JWT_SECRET=my-super-secret-key
ENCRYPTION_KEY=abcdefghijklmnop12345678abcdefgh
DATABASE_URL=postgres://dotkey:hunter2@db:5432/dotkey?sslmode=disable
PORT=8080
ALLOWED_ORIGINS=http://localhost:3000

# After encryption
JWT_SECRET=encrypted:v1:KaQPBZ4n3ZhiQalf:og_ElCqNiJG7QGYEZLf...
ENCRYPTION_KEY=encrypted:v1:pCy2-sRxLERXH05k:TyAwL2fbfIZss5kPA...
DATABASE_URL=encrypted:v1:lV7A4SKCSzvfdxNY:J6rLa8VdYNDVKkkpQz...
PORT=8080
ALLOWED_ORIGINS=http://localhost:3000
```

The server reads `DOTKEY_MASTER_KEY` from its environment at startup and decrypts the `encrypted:v1:…` values automatically before any config is loaded. The rest of the application is completely unaware — it sees only plaintext values.

---

## Why this matters

The `.env` file on disk is the single biggest risk to a self-hosted dotkey instance. If an attacker reads it, they get:

- `ENCRYPTION_KEY` — decrypts every variable stored in the database
- `JWT_SECRET` — can forge valid session tokens
- `DATABASE_URL` — direct database access including all encrypted blobs

With `.env` encryption, none of those values are readable without `DOTKEY_MASTER_KEY`, which lives outside the file entirely (in a Docker secret, systemd credential, or operator shell). A leaked `.env` file on its own is useless.

---

## Quick start

### 1. Build the tool

```bash
git clone https://github.com/muhmunt/dotkey
cd dotkey
go build -o dotkey-enc ./tools/envenc
```

### 2. Generate a master key

```bash
./dotkey-enc keygen
```

Output:

```
DOTKEY_MASTER_KEY=499601be72f59936b1c7128365bde90ca9910048c23268ce48af6966e8c970dd
```

This is 32 random bytes (256 bits) encoded as hex. **Copy it somewhere safe — a password manager, a secrets vault, or a secure note. You cannot decrypt your `.env` without it.**

### 3. Export the master key in your shell

```bash
export DOTKEY_MASTER_KEY=499601be72f59936b1c7128365bde90ca9910048c23268ce48af6966e8c970dd
```

### 4. Encrypt your .env

```bash
./dotkey-enc encrypt .env
# encrypted 4 value(s) in .env
```

By default, `encrypt` targets any key whose name contains `SECRET`, `KEY`, `PASSWORD`, `PASSWD`, `TOKEN`, `DATABASE_URL`, `DSN`, `PRIVATE`, or `CREDENTIAL`. Non-matching keys (like `PORT`) are left as plain text.

### 5. Start the server

```bash
DOTKEY_MASTER_KEY=<your-key> ./dotkey-api
```

Or with Docker Compose — see [Deployment scenarios](#deployment-scenarios).

---

## dotkey-enc command reference

### `keygen`

```bash
./dotkey-enc keygen
```

Prints a new `DOTKEY_MASTER_KEY=<64-char hex>` to stdout. Each run produces a different key. Redirect to a file or copy to your secrets manager.

---

### `encrypt`

```bash
./dotkey-enc encrypt <file> [KEY KEY ...]
```

Encrypts values in-place and overwrites the file. The original file is replaced with the encrypted version.

| Mode | Command | Behaviour |
|------|---------|-----------|
| Auto (recommended) | `./dotkey-enc encrypt .env` | Encrypts all keys matching the sensitive-name heuristic |
| Explicit | `./dotkey-enc encrypt .env JWT_SECRET ENCRYPTION_KEY` | Encrypts only the named keys |

**Auto-encrypted key patterns** (case-insensitive substring match):

| Pattern | Example keys matched |
|---------|---------------------|
| `SECRET` | `JWT_SECRET`, `APP_SECRET` |
| `KEY` | `ENCRYPTION_KEY`, `API_KEY` |
| `PASSWORD` | `DB_PASSWORD`, `SMTP_PASSWORD` |
| `TOKEN` | `ACCESS_TOKEN`, `REFRESH_TOKEN` |
| `DATABASE_URL` | `DATABASE_URL` |
| `DSN` | `POSTGRES_DSN` |
| `PRIVATE` | `PRIVATE_KEY` |
| `CREDENTIAL` | `GCP_CREDENTIAL` |

Values already in `encrypted:v1:…` format are skipped automatically — it is safe to run `encrypt` multiple times.

```bash
# First run — encrypts 4 values
./dotkey-enc encrypt .env
# encrypted 4 value(s) in .env

# Second run — nothing changes (already encrypted)
./dotkey-enc encrypt .env
# encrypted 0 value(s) in .env
```

---

### `decrypt`

```bash
./dotkey-enc decrypt <file>
```

Prints the fully decrypted contents to **stdout only**. The file on disk is never modified. Use this to inspect values, debug startup issues, or copy a value temporarily.

```bash
./dotkey-enc decrypt .env
# JWT_SECRET=my-super-secret-key
# ENCRYPTION_KEY=abcdefghijklmnop12345678abcdefgh
# DATABASE_URL=postgres://dotkey:hunter2@db:5432/dotkey
# PORT=8080
```

---

## How the server decrypts at startup

`cmd/main.go` runs this immediately after loading `.env`:

```go
if mk := os.Getenv("DOTKEY_MASTER_KEY"); mk != "" {
    if err := envenc.DecryptOSEnv(mk); err != nil {
        log.Fatalf("dotkey-enc: failed to decrypt environment: %v", err)
    }
}
```

`DecryptOSEnv` walks every environment variable. For any value starting with `encrypted:v1:`, it decrypts it in memory and calls `os.Setenv` to replace it with the plaintext. The rest of the application (config loading, database connection, JWT signing) sees only the original values.

If `DOTKEY_MASTER_KEY` is **not set**, all values are used as-is. This means:

- Development (no encryption): works with no changes
- Production (encrypted `.env`): fails fast with a clear error if the key is wrong or missing

---

## CLI token encryption

The `dotkey` CLI stores your login token in `~/.dotkey/config.yaml`. With this release, the token is **automatically encrypted** using a per-machine key stored in `~/.dotkey/key`.

```yaml
# ~/.dotkey/config.yaml — what it looks like after login
api_url: http://localhost:8080
token: encrypted:v1:KaQPBZ4n3ZhiQalf:og_ElCqNiJG7QGYEZLfj...
current_project_id: abc123
current_project_name: my-app
```

```
~/.dotkey/
├── config.yaml   (0600) — project state + encrypted token
└── key           (0600) — 32-byte random machine key (auto-generated on first login)
```

**How it works:**

- On first `dotkey login`, a 32-byte random key is generated and saved to `~/.dotkey/key` with `0600` permissions
- Every time a token is saved, it is encrypted with that machine key before being written to `config.yaml`
- Every time `config.yaml` is read, the token is decrypted transparently
- Old plaintext tokens (from before this change) are read normally and re-encrypted on next save

**In CI environments**, set `DOTKEY_TOKEN` to override the file entirely:

```bash
export DOTKEY_TOKEN=dotkey_tok_...
dotkey pull
```

When `DOTKEY_TOKEN` is set, the `~/.dotkey/config.yaml` token field is ignored completely.

---

## Deployment scenarios

### Docker Compose

Pass the master key as an environment variable in your shell before running Compose:

```bash
export DOTKEY_MASTER_KEY=<your-key>
docker-compose up -d
```

Or add it to a separate, restricted `.env.keys` file that is **not** committed:

```bash
# .env.keys — never commit this
DOTKEY_MASTER_KEY=499601be72f59936b1c7128365bde90ca9910048c23268ce48af6966e8c970dd
```

```yaml
# docker-compose.yml
services:
  api:
    env_file:
      - .env          # contains encrypted values
      - .env.keys     # contains DOTKEY_MASTER_KEY only
```

Add `.env.keys` to `.gitignore`:

```bash
echo ".env.keys" >> .gitignore
```

---

### Docker secrets (Swarm / production)

```bash
echo "499601be72f59936b1c7128365bde90ca9910048c23268ce48af6966e8c970dd" \
  | docker secret create dotkey_master_key -
```

```yaml
# docker-compose.yml (Swarm mode)
services:
  api:
    secrets:
      - dotkey_master_key
    environment:
      DOTKEY_MASTER_KEY_FILE: /run/secrets/dotkey_master_key
```

!!! note
    dotkey reads `DOTKEY_MASTER_KEY` directly from the environment, not from a file.
    Use an entrypoint wrapper to read the secret file:

    ```bash
    #!/bin/sh
    export DOTKEY_MASTER_KEY=$(cat /run/secrets/dotkey_master_key)
    exec "$@"
    ```

---

### systemd

```ini
# /etc/systemd/system/dotkey.service
[Service]
EnvironmentFile=/etc/dotkey/master.key   # mode 0600, owned by dotkey user
ExecStart=/usr/local/bin/dotkey-api
```

```bash
# /etc/dotkey/master.key (0600)
DOTKEY_MASTER_KEY=499601be72f59936b1c7128365bde90ca9910048c23268ce48af6966e8c970dd
```

```bash
chmod 600 /etc/dotkey/master.key
chown dotkey:dotkey /etc/dotkey/master.key
```

---

## Key rotation

If you need to change `DOTKEY_MASTER_KEY` (e.g., after a suspected key leak):

```bash
# 1. Decrypt .env with the OLD key
export DOTKEY_MASTER_KEY=<old-key>
./dotkey-enc decrypt .env > .env.plain

# 2. Generate a new key
./dotkey-enc keygen
# → DOTKEY_MASTER_KEY=<new-key>

# 3. Re-encrypt with the NEW key
export DOTKEY_MASTER_KEY=<new-key>
cp .env.plain .env
./dotkey-enc encrypt .env

# 4. Securely delete the plaintext copy
shred -u .env.plain   # or: rm .env.plain on macOS

# 5. Update the master key wherever it is stored (Docker secret, systemd, etc.)
# 6. Restart the server
```

!!! warning
    `DOTKEY_MASTER_KEY` is only used to protect the `.env` file.
    Rotating it does **not** affect `ENCRYPTION_KEY` (which protects database values)
    or `JWT_SECRET` (which signs session tokens).
    Those are separate rotations — see [Secret rotation](../self-hosting/env-vars.md#secret-rotation).

---

## Encryption details

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key derivation | SHA-256 of `DOTKEY_MASTER_KEY` → 32-byte key |
| Nonce | 12-byte random per encryption (GCM standard) |
| Authentication | GCM tag (tamper detection built-in) |
| Encoding | Base64 URL-safe (no padding) |
| Format | `encrypted:v1:<nonce>:<ciphertext+tag>` |

Every value is encrypted independently with a fresh random nonce, so encrypting the same value twice produces different ciphertext. A tampered value is detected at decrypt time (GCM authentication tag fails) and causes a fatal startup error.

---

## Troubleshooting

**Server fails to start with "failed to decrypt environment"**

The `DOTKEY_MASTER_KEY` is wrong or not set. Verify it matches the key used when `encrypt` was run:

```bash
./dotkey-enc decrypt .env
```

If decrypt succeeds, the key is correct and the issue is with how the key is passed to the server.

---

**"malformed encrypted value" error**

The value in `.env` was partially corrupted (e.g., truncated by a text editor). Restore `.env` from backup or re-encrypt from the original plaintext.

---

**I lost my DOTKEY_MASTER_KEY**

If you still have a running server, you can read the plaintext values from the live process environment:

```bash
# On Linux — read the process environment directly
cat /proc/$(pidof dotkey-api)/environ | tr '\0' '\n' | grep -E 'JWT_SECRET|ENCRYPTION_KEY|DATABASE_URL'
```

If the server is not running and you have no backup of the key, the encrypted values in `.env` are permanently unrecoverable. Always back up `DOTKEY_MASTER_KEY` to a password manager or secrets vault.

---

**dotkey-enc not found**

Build it from source:

```bash
go build -o dotkey-enc ./tools/envenc
# or run directly without building
DOTKEY_MASTER_KEY=<key> go run ./tools/envenc encrypt .env
```

---

**I want to add a new variable to an already-encrypted .env**

Add it as plain text first, then run `encrypt` again. Already-encrypted values are skipped:

```bash
echo "NEW_SECRET=my-value" >> .env
./dotkey-enc encrypt .env NEW_SECRET
# encrypted 1 value(s) in .env
```
