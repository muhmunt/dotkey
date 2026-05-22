# Projects API

All endpoints require `Authorization: Bearer <token>`.

## List projects

`GET /api/v1/projects`

Returns all projects where the authenticated user is a member.

## Create project

`POST /api/v1/projects`

```json
{ "name": "my-service", "description": "Main API" }
```

## Get project

`GET /api/v1/projects/:id`

## Update project

`PUT /api/v1/projects/:id`

```json
{ "name": "new-name", "description": "updated" }
```

Requires **owner** or **admin** role.

## Delete project

`DELETE /api/v1/projects/:id`

Requires **owner** role. Cascades — deletes all environments, variables, and history.

## List members

`GET /api/v1/projects/:id/members`

## Add member

`POST /api/v1/projects/:id/members`

```json
{ "email": "alice@example.com", "role": "developer" }
```

Valid roles: `admin`, `developer`, `readonly`

## Update member role

`PUT /api/v1/projects/:id/members/:uid`

```json
{ "role": "admin" }
```

## Remove member

`DELETE /api/v1/projects/:id/members/:uid`

## Environments

`GET /api/v1/projects/:id/environments`
`POST /api/v1/projects/:id/environments` — `{ "name": "staging" }`
`PUT /api/v1/projects/:id/environments/:eid` — rename
`PATCH /api/v1/projects/:id/environments/:eid/lock` — `{ "locked": true }`
`DELETE /api/v1/projects/:id/environments/:eid`

## Diff

`GET /api/v1/projects/:id/diff?from=<envId>&to=<envId>`

Returns a list of diff entries with `status`: `same`, `changed`, `missing_in_a`, `missing_in_b`.

## Activity feed

`GET /api/v1/projects/:id/activity?env=<envId>&action=<action>&limit=50&offset=0`

## CI/CD Tokens

`GET /api/v1/projects/:id/tokens`
`POST /api/v1/projects/:id/tokens` — `{ "name": "ci-deploy", "permissions": "read" }`
`DELETE /api/v1/projects/:id/tokens/:tid`
