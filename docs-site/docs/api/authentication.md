# API Authentication

All authenticated endpoints require a `Bearer` token in the `Authorization` header.

## Register

`POST /api/v1/auth/register`

```json
{
  "name": "Muhammad",
  "email": "you@example.com",
  "password": "min8chars"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "...", "name": "Muhammad", "email": "you@example.com" }
}
```

---

## Login

`POST /api/v1/auth/login`

```json
{ "email": "you@example.com", "password": "yourpassword" }
```

**Response (no 2FA):**
```json
{ "token": "eyJhbGciOi..." }
```

**Response (2FA enabled):**
```json
{ "requires_2fa": true, "state_token": "eyJhbGciOi..." }
```

Pass `state_token` to the 2FA step — it expires in 5 minutes.

---

## Login — 2FA step

`POST /api/v1/auth/login/2fa`

```json
{ "state_token": "eyJhbGciOi...", "code": "123456" }
```

**Response:**
```json
{ "token": "eyJhbGciOi..." }
```

---

## Login — backup code

`POST /api/v1/auth/login/backup-code`

Use this when the authenticator app is unavailable. Each backup code is single-use.

```json
{ "state_token": "eyJhbGciOi...", "backup_code": "ABCD-EFGH" }
```

**Response:**
```json
{ "token": "eyJhbGciOi..." }
```

Codes are case-insensitive and hyphens are optional (`ABCDEFGH` is equivalent to `ABCD-EFGH`).

---

## Get current user

`GET /api/v1/auth/me`

```
Authorization: Bearer eyJhbGciOi...
```

---

## Update name

`PUT /api/v1/auth/me`

```json
{ "name": "New Name" }
```

Returns the updated user object.

---

## Change password

`POST /api/v1/auth/change-password`

```json
{ "current_password": "oldpassword", "new_password": "newpassword" }
```

Requires at least 8 characters for the new password.

---

## Forgot password

`POST /api/v1/auth/forgot-password`

```json
{ "email": "you@example.com" }
```

Always returns `200` with an identical body whether or not the email exists (prevents enumeration).

**Response:**
```json
{ "request_id": "550e8400-e29b-41d4-a716-446655440000" }
```

If the email is not registered, or the account does not have 2FA enabled, `request_id` is an empty string. The response body is the same either way — always show the verify step on the frontend.

The `request_id` is valid for **15 minutes** and can only be used once.

---

## Reset password

`POST /api/v1/auth/reset-password`

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456",
  "new_password": "newpassword"
}
```

Validates `request_id` (from forgot-password), then validates the TOTP code, then updates the password.

**Response:**
```json
{ "message": "password reset successfully" }
```

**Error responses:**

| Status | Error | Meaning |
|--------|-------|---------|
| 400 | `session expired, please start over` | `request_id` not found or expired |
| 400 | `invalid 2FA code` | Wrong TOTP code |
| 400 | `password must be at least 8 characters` | Password too short |

---

## Refresh token

`POST /api/v1/auth/refresh`

Issues a fresh 24-hour JWT for the currently authenticated user. The dashboard calls this automatically when fewer than 1 hour remains on the current token.

**Response:**
```json
{ "token": "eyJhbGciOi..." }
```

---

## Logout

`POST /api/v1/auth/logout`

Revokes the current JWT server-side. Subsequent requests with the same token return `401`.

---

## Delete account

`DELETE /api/v1/auth/me`

```json
{ "password": "yourpassword" }
```

Permanently deletes the account. Returns `400` if the user is the sole owner of any project — transfer or delete those projects first.

---

## 2FA setup

`POST /api/v1/auth/2fa/setup`

Generates a new TOTP secret and returns an `otpauth://` URL for QR display.

```json
{ "qr_url": "otpauth://totp/dotkey:you@example.com?secret=..." }
```

---

## Confirm 2FA

`POST /api/v1/auth/2fa/confirm`

```json
{ "code": "123456" }
```

Validates the first code, enables 2FA, and returns **8 one-time backup codes** (shown once only):

```json
{
  "message": "2FA enabled",
  "backup_codes": [
    "ABCD-EFGH", "WXYZ-1234", "MNPQ-5678", "RSTU-9012",
    "VWXY-3456", "BCDE-7890", "FGHJ-1234", "KLMN-5678"
  ]
}
```

Store these backup codes securely — they cannot be retrieved again.

---

## Disable 2FA

`DELETE /api/v1/auth/2fa`

```json
{ "code": "123456" }
```

Requires a valid TOTP code. Also deletes all backup codes.

---

## Backup code count

`GET /api/v1/auth/2fa/backup-codes/count`

```json
{ "remaining": 7 }
```

Returns how many unused backup codes remain. Does not reveal the codes themselves.

---

## Regenerate backup codes

`POST /api/v1/auth/2fa/backup-codes/regenerate`

```json
{ "code": "123456" }
```

Requires a valid TOTP code. Invalidates all existing backup codes and returns 8 new ones:

```json
{
  "backup_codes": ["ABCD-EFGH", "WXYZ-1234", ...]
}
```

---

## Reveal lock

When 2FA is enabled, the export endpoint additionally requires `X-Reveal-Token`.

### Unlock

`POST /api/v1/auth/reveal/unlock`

```json
{ "code": "123456" }
```

```json
{
  "reveal_token": "eyJhbGciOi...",
  "expires_in": 900
}
```

Pass the reveal token as a header on export requests:

```
X-Reveal-Token: eyJhbGciOi...
```

---

## Security audit log

`GET /api/v1/auth/audit-log`

Returns the last 100 security events for the current user.

```json
[
  {
    "id": "...",
    "action": "export",
    "ip": "192.168.1.1",
    "detail": "project:abc env:xyz",
    "created_at": "2026-05-26T14:03:00Z"
  },
  {
    "id": "...",
    "action": "login.success",
    "ip": "192.168.1.1",
    "detail": "",
    "created_at": "2026-05-26T09:11:00Z"
  }
]
```

**Action values:**

| Action | Trigger |
|--------|---------|
| `login.success` | Password login succeeded |
| `login.success.2fa` | 2FA login step succeeded |
| `login.failed` | Login attempt with wrong credentials |
| `2fa.enabled` | 2FA was enabled |
| `2fa.disabled` | 2FA was disabled |
| `password.changed` | Password changed via Settings |
| `export` | Variables exported (project + env in `detail`) |

---

## Project tokens

Include `dotkey_tok_...` as the Bearer token — no separate auth step needed:

```
Authorization: Bearer dotkey_tok_a1b2c3d4e5f6...
```

---

## CLI device flow

| Step | Endpoint |
|------|---------|
| Start | `POST /api/v1/auth/device` |
| Poll | `GET /api/v1/auth/device/poll?device_code=...` |
| Approve | `POST /api/v1/auth/device/activate` |

---

## Rate limits

All auth endpoints share a **10 requests per 15 minutes per IP** limit. User search is limited to **10 requests per minute per IP**.

Exceeding the limit returns `429 Too Many Requests`.
