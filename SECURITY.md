# Security Policy

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Email: **security@dotkey.io**

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

We will acknowledge your report within **48 hours** and aim to release a patch within **14 days** for confirmed issues.

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✓         |

## Security features

| Feature | Implementation |
|---------|---------------|
| Secrets at rest | AES-256-GCM, unique random nonce per encryption |
| Passwords | bcrypt (cost 10) |
| Sessions | JWT (24h expiry, HS256) |
| 2FA | TOTP RFC 6238 (Google Authenticator, Authy) |
| Reveal lock | Separate 2FA code required to view values (15-min session) |
| CI tokens | SHA-256 hashed, never stored in plaintext |
| Transport | HTTPS enforced in production |
| CORS | Locked to configured `ALLOWED_ORIGINS` |
| Rate limiting | 10 login attempts / IP / minute |

## Responsible disclosure

We appreciate responsible disclosure. Security researchers who report valid vulnerabilities will be credited in the release notes (unless they prefer to remain anonymous).
