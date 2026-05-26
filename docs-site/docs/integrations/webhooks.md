# Webhook Integrations

dotkey can notify any HTTP endpoint when variables change — useful for triggering deploys, cache invalidation, or Slack alerts.

## Creating a webhook

1. Open your project → **Webhooks** in the sidebar
2. Click **Add webhook**
3. Enter the payload URL
4. Select the events you want to receive
5. Click **Create webhook**

The webhook secret is shown once — copy it now and store it securely.

## Payload format

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

## Verifying the signature

Every delivery includes `X-Dotkey-Signature: sha256=<hex>`. Verify it to confirm the request came from dotkey:

```js
const crypto = require("crypto")

app.post("/hooks/dotkey", (req, res) => {
  const sig = req.headers["x-dotkey-signature"]
  const expected = "sha256=" + crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest("hex")

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return res.status(401).send("Invalid signature")
  }

  const { event, key, environment_name } = req.body
  console.log(`${event}: ${key} in ${environment_name}`)
  res.sendStatus(200)
})
```

## Example: Trigger a GitHub Actions workflow

Use the `repository_dispatch` event to trigger a workflow when a production variable changes:

```js
if (event === "variable.updated" && environment_name === "production") {
  await fetch("https://api.github.com/repos/org/repo/dispatches", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event_type: "env-changed" }),
  })
}
```

## URL validation

Webhook URLs must be publicly reachable HTTP or HTTPS endpoints. The following are rejected at creation time:

- Non-HTTP/HTTPS schemes (`ftp://`, `file://`, etc.)
- Loopback addresses (`127.x.x.x`, `::1`)
- Private IP ranges (`10.x`, `172.16–31.x`, `192.168.x`)
- Link-local addresses (`169.254.x.x` — AWS/GCP metadata endpoints)
- Unspecified addresses (`0.0.0.0`)

## Delivery behaviour

- Requests time out after **5 seconds**
- Failed deliveries are **not retried** — design your handler to be idempotent
- Only `active` webhooks receive deliveries

## Debugging with the delivery log

If your endpoint is not receiving events, check the delivery log in the dashboard (project → Webhooks → click the webhook → Deliveries) or via the API:

```
GET /api/v1/projects/:id/webhooks/:wid/deliveries
```

The log shows the last 25 attempts, including the HTTP status code and any network error. A `response_status` of `0` means dotkey never received an HTTP response (timeout or DNS failure).

See [Webhooks API](../api/webhooks.md#delivery-log) for the full endpoint reference.
