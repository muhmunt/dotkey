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

## Login — 2FA step

`POST /api/v1/auth/login/2fa`

```json
{ "state_token": "eyJhbGciOi...", "code": "123456" }
```

**Response:**
```json
{ "token": "eyJhbGciOi..." }
```

## Get current user

`GET /api/v1/auth/me`

```
Authorization: Bearer eyJhbGciOi...
```

## Project tokens

Include `dotkey_tok_...` as the Bearer token — no separate auth step needed:

```
Authorization: Bearer dotkey_tok_a1b2c3d4e5f6...
```

## CLI device flow

| Step | Endpoint |
|------|---------|
| Start | `POST /api/v1/auth/device` |
| Poll | `GET /api/v1/auth/device/poll?device_code=...` |
| Approve | `POST /api/v1/auth/device/activate` |

## Update name

`PUT /api/v1/auth/me`

```json
{ "name": "New Name" }
```

Returns the updated user object.

## Change password

`POST /api/v1/auth/change-password`

```json
{ "current_password": "oldpassword", "new_password": "newpassword" }
```

Requires at least 8 characters for the new password.

## Forgot password

`POST /api/v1/auth/forgot-password`

```json
{ "email": "you@example.com" }
```

Always returns 200 — does not reveal whether the email exists. If `SMTP_HOST` is configured, sends a reset link to the address.

## Reset password

`POST /api/v1/auth/reset-password`

```json
{ "token": "<raw token from email link>", "new_password": "newpassword" }
```

Token is valid for 1 hour and single-use.

## Delete account

`DELETE /api/v1/auth/me`

```json
{ "password": "yourpassword" }
```

Permanently deletes the account. Returns 400 if the user is the sole owner of any project — transfer or delete those projects first.

## Reveal lock

When 2FA is enabled, the export endpoint additionally requires `X-Reveal-Token`:

`POST /api/v1/auth/reveal/unlock` — returns a reveal token valid for 15 minutes.

```
X-Reveal-Token: eyJhbGciOi...
```
