# Variables API

All endpoints require `Authorization: Bearer <token>`.

Base path: `/api/v1/projects/:id/environments/:eid`

## List variables

`GET .../variables`

Returns all variables for the environment. Values are always masked (`***`).

## Create variable

`POST .../variables`

```json
{ "key": "DATABASE_URL", "value": "postgres://..." }
```

Requires at least **developer** role. Returns 400 if key already exists.

## Update variable

`PUT .../variables/:vid`

```json
{ "value": "new-value" }
```

Requires at least **developer** role.

## Delete variable

`DELETE .../variables/:vid`

Requires **owner** or **admin** role.

## Export (pull)

`GET .../export`

Returns raw `KEY=VALUE` plaintext with decrypted values.

If 2FA is enabled, requires `X-Reveal-Token` header.

```
DATABASE_URL=postgres://...
JWT_SECRET=supersecret
REDIS_URL=redis://localhost:6379
```

## Import (push)

`POST .../import`

```json
{ "content": "DATABASE_URL=postgres://...\nJWT_SECRET=abc123" }
```

Upserts all variables — existing keys are updated, new keys are created.

**Response:**
```json
{ "message": "import successful", "synced": 3 }
```

## History

`GET .../history`

Returns the full change log for the environment, newest first.

## Rollback

`POST .../rollback/:versionId`

Restores a variable to its state at the given version. Adds a `rolled_back` entry to history.

## Global search

`GET /api/v1/search?q=DATABASE`

Searches project names and variable keys across all accessible projects.
