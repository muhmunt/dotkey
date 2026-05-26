# Security

## Secrets at rest

Every variable value is encrypted with **AES-256-GCM** before being written to the database.

- A unique random nonce is generated for every encryption operation
- The same plaintext encrypted twice produces different ciphertexts
- Without the `ENCRYPTION_KEY`, the database contains only unreadable ciphertext
- The server refuses to start if `ENCRYPTION_KEY` is not exactly 32 bytes — short keys are never silently zero-padded

## .env file encryption

The server's own `.env` file (which contains `ENCRYPTION_KEY`, `JWT_SECRET`, `DATABASE_URL`) can be encrypted at rest using the `dotkey-enc` tool. Sensitive values are replaced with `encrypted:v1:…` blobs; the server decrypts them in memory at startup using `DOTKEY_MASTER_KEY`, which is never stored in the `.env` file itself.

See [.env Encryption](self-hosting/env-encryption.md) for the full guide.

The CLI auth token stored in `~/.dotkey/config.yaml` is also encrypted at rest using a per-machine key (`~/.dotkey/key`, mode 0600).

## Passwords

User passwords are hashed with **bcrypt** (cost factor 10). The plaintext password is never stored or logged.

## Sessions

- JWT tokens are signed with **HS256** using `JWT_SECRET`
- Tokens expire after **24 hours**
- Sessions are silently refreshed when fewer than 1 hour remains — no action required
- Logout revokes the token server-side via a JTI blocklist (expired entries are purged every 10 minutes)
- Device codes (CLI login) expire after **15 minutes**

## Two-factor authentication

TOTP 2FA is implemented per **RFC 6238** (the same standard used by Google Authenticator and Authy). 2FA is mandatory — all new accounts are redirected to the setup flow before they can access the dashboard.

When enabled:
- Login requires password **and** a 6-digit code from your authenticator app
- Viewing secret values requires a separate 2FA unlock (15-minute session)
- Even a stolen JWT cannot reveal secrets without the authenticator code
- 8 one-time backup codes are issued at setup for account recovery if the authenticator is lost

Password reset is also protected by TOTP — no SMTP server is required. The reset flow uses a short-lived server-side state token (returned as an opaque `request_id`) to prevent account enumeration.

## Webhook secrets

Webhook signing secrets are encrypted at rest in the database using **AES-256-GCM** (the same key as variable values). A database breach does not expose HMAC keys. The plaintext secret is shown only once at creation and cannot be retrieved again.

## SSRF protection

Webhook URLs are validated at creation time. The following targets are rejected:

| Rejected class | Examples |
|---|---|
| Non-HTTP(S) schemes | `ftp://`, `file://` |
| Loopback addresses | `127.x.x.x`, `::1` |
| Private ranges | `10.x`, `172.16–31.x`, `192.168.x` |
| Link-local addresses | `169.254.x.x` (AWS/GCP metadata) |
| Unspecified addresses | `0.0.0.0` |

## Security headers

Every API response includes the following headers:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` |
| `Content-Security-Policy` | `default-src 'self'` |

## Security audit log

Key security events are logged to an `audit_logs` table and accessible via `GET /api/v1/auth/audit-log`. The log retains the last 100 entries per user.

**Logged events:**

| Event | Trigger |
|---|---|
| `login.success` | Password login succeeded |
| `login.success.2fa` | 2FA login step succeeded |
| `login.failed` | Login attempt with wrong credentials |
| `2fa.enabled` | 2FA was enabled |
| `2fa.disabled` | 2FA was disabled |
| `password.changed` | Password changed via Settings |
| `export` | Variables exported (project and environment recorded) |

See [Account Settings](dashboard/settings.md#security-log) for the dashboard view.

## CI/CD tokens

- Project tokens are stored as **SHA-256 hashes** — the plaintext is shown only once at creation
- Tokens are scoped to a single project
- They never expire but can be revoked at any time
- Token auth bypasses the reveal lock (CI pipelines can pull secrets without a 2FA code)

## CORS

The API rejects cross-origin requests from any origin not listed in `ALLOWED_ORIGINS`. Set this to your dashboard domain in production.

## Rate limiting

| Endpoint | Limit |
|---|---|
| All auth endpoints | 10 requests per 15 minutes per IP |
| `GET /users/search` | 10 requests per minute per IP |

Exceeding the limit returns `429 Too Many Requests`.

## Reporting vulnerabilities

See [SECURITY.md](https://github.com/muhmunt/dotkey/blob/main/SECURITY.md) for the responsible disclosure process.
