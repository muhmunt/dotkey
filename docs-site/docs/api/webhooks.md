# Webhooks API

Webhooks let dotkey notify your systems when variables change.

Base path: `/api/v1/projects/:id/webhooks`

Requires **owner** or **admin** role for create/delete. All members can list.

## List webhooks

`GET /api/v1/projects/:id/webhooks`

## Create webhook

`POST /api/v1/projects/:id/webhooks`

```json
{
  "url": "https://example.com/hooks/dotkey",
  "events": ["variable.created", "variable.updated", "variable.deleted"]
}
```

**Available events:**

| Event | Fires when |
|---|---|
| `variable.created` | A new variable is added |
| `variable.updated` | A variable's value is changed |
| `variable.deleted` | A variable is deleted |

**Response:**
```json
{
  "id": "...",
  "project_id": "...",
  "url": "https://example.com/hooks/dotkey",
  "events": ["variable.created", "variable.updated", "variable.deleted"],
  "active": true,
  "created_at": "..."
}
```

## Delete webhook

`DELETE /api/v1/projects/:id/webhooks/:wid`

## Payload

dotkey sends a `POST` request with this JSON body:

```json
{
  "event": "variable.updated",
  "project_id": "abc123",
  "environment_id": "xyz789",
  "environment_name": "production",
  "key": "DATABASE_URL",
  "actor": "user-id",
  "timestamp": "2026-05-25T10:00:00Z"
}
```

## Verifying signatures

Every delivery includes an `X-Dotkey-Signature` header:

```
X-Dotkey-Signature: sha256=<hex>
```

The value is `HMAC-SHA256(secret, raw_body)`. Verify it in your handler:

=== "Node.js"

    ```js
    const crypto = require("crypto")

    function verify(secret, rawBody, signature) {
      const expected = "sha256=" + crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex")
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    }
    ```

=== "Python"

    ```python
    import hmac, hashlib

    def verify(secret: str, raw_body: bytes, signature: str) -> bool:
        expected = "sha256=" + hmac.new(
            secret.encode(), raw_body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
    ```

!!! note "Secret storage"
    The webhook secret is only returned once at creation time — store it securely.
    If lost, delete the webhook and create a new one.
