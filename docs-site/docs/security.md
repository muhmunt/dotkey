# Security

## Secrets at rest

Every variable value is encrypted with **AES-256-GCM** before being written to the database.

- A unique random nonce is generated for every encryption operation
- The same plaintext encrypted twice produces different ciphertexts
- Without the `ENCRYPTION_KEY`, the database contains only unreadable ciphertext

## Passwords

User passwords are hashed with **bcrypt** (cost factor 10). The plaintext password is never stored or logged.

## Sessions

- JWT tokens are signed with **HS256** using `JWT_SECRET`
- Tokens expire after **24 hours**
- Device codes (CLI login) expire after **15 minutes**

## Two-factor authentication

TOTP 2FA is implemented per **RFC 6238** (the same standard used by Google Authenticator and Authy).

When enabled:
- Login requires password **and** a 6-digit code from your authenticator app
- Viewing secret values requires a separate 2FA unlock (15-minute session)
- Even a stolen JWT cannot reveal secrets without the authenticator code

## CI/CD tokens

- Project tokens are stored as **SHA-256 hashes** — the plaintext is shown only once at creation
- Tokens are scoped to a single project
- They never expire but can be revoked at any time
- Token auth bypasses the reveal lock (CI pipelines can pull secrets without a 2FA code)

## CORS

The API rejects cross-origin requests from any origin not listed in `ALLOWED_ORIGINS`. Set this to your dashboard domain in production.

## Rate limiting

Login attempts are limited to **10 per IP per minute** to prevent brute-force attacks.

## Reporting vulnerabilities

See [SECURITY.md](https://github.com/muhmunt/dotkey/blob/main/SECURITY.md) for the responsible disclosure process.
