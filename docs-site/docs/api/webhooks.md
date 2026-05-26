# Webhooks API

Webhooks let dotkey notify your systems when variables change.

Base path: `/api/v1/projects/:id/webhooks`

Requires **owner** or **admin** role for create/delete. All members can list and view deliveries.

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
  "created_at": "...",
  "secret": "a3f8c2d1e9b4..."
}
```

The `secret` field is **only included in the create response** — it is not stored in plaintext and cannot be retrieved again. Save it now. If lost, delete and recreate the webhook.

!!! info "Secret encryption"
    Webhook secrets are encrypted at rest in the database using AES-256-GCM
    (the same key as variable values). A database breach does not expose HMAC keys.

### URL validation

Webhook URLs must be reachable public HTTP or HTTPS endpoints. The following are rejected at creation time:

- Non-HTTP/HTTPS schemes (`ftp://`, `file://`, etc.)
- Loopback addresses (`127.x.x.x`, `::1`)
- Private ranges (`10.x`, `172.16-31.x`, `192.168.x`)
- Link-local addresses (`169.254.x.x` — AWS/GCP metadata endpoints)
- Unspecified addresses (`0.0.0.0`)

## Delete webhook

`DELETE /api/v1/projects/:id/webhooks/:wid`

## Delivery log

`GET /api/v1/projects/:id/webhooks/:wid/deliveries`

Returns the last 25 deliveries for the webhook, newest first.

```json
[
  {
    "id": "...",
    "webhook_id": "...",
    "event": "variable.updated",
    "response_status": 200,
    "error": "",
    "delivered_at": "2026-05-26T14:03:00Z"
  },
  {
    "id": "...",
    "webhook_id": "...",
    "event": "variable.created",
    "response_status": 0,
    "error": "Post \"https://example.com/hooks/dotkey\": context deadline exceeded (Client.Timeout exceeded while awaiting headers)",
    "delivered_at": "2026-05-26T12:00:00Z"
  }
]
```

| Field | Meaning |
|---|---|
| `response_status` | HTTP status code returned by the receiver. `0` means a network or timeout error — no HTTP response was received. |
| `error` | Empty on success. Contains the network error message when `response_status` is `0`. |

**Delivery behaviour:**

- Requests time out after **5 seconds**
- Failed deliveries are **not retried** — design your handler to be idempotent
- Only `active` webhooks receive deliveries

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
  "timestamp": "2026-05-26T10:00:00Z"
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

    app.post("/hooks/dotkey", (req, res) => {
      if (!verify(process.env.WEBHOOK_SECRET, req.rawBody, req.headers["x-dotkey-signature"])) {
        return res.status(401).send("Invalid signature")
      }
      const { event, key, environment_name } = req.body
      console.log(`${event}: ${key} in ${environment_name}`)
      res.sendStatus(200)
    })
    ```

=== "Python"

    ```python
    import hmac, hashlib
    from flask import request, abort

    def verify(secret: str, raw_body: bytes, signature: str) -> bool:
        expected = "sha256=" + hmac.new(
            secret.encode(), raw_body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    @app.route("/hooks/dotkey", methods=["POST"])
    def webhook():
        if not verify(os.environ["WEBHOOK_SECRET"], request.data,
                      request.headers.get("X-Dotkey-Signature", "")):
            abort(401)
        data = request.json
        print(f"{data['event']}: {data['key']} in {data['environment_name']}")
        return "", 200
    ```

=== "Go"

    ```go
    func verify(secret string, body []byte, signature string) bool {
        mac := hmac.New(sha256.New, []byte(secret))
        mac.Write(body)
        expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
        return hmac.Equal([]byte(expected), []byte(signature))
    }
    ```

!!! tip "Use the delivery log to debug"
    If your endpoint is not receiving events, check the delivery log
    (`GET /projects/:id/webhooks/:wid/deliveries`) to see the HTTP status or
    network error for each attempt.
