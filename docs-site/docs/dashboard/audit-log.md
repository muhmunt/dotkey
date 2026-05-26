# Security Log

The security log records key account events — useful for spotting unexpected logins or unauthorized changes.

Access it at **Settings → Security log**.

```
Security log

2026-05-26 14:03   export         project: my-app  env: production   IP 192.168.1.1
2026-05-26 09:11   login.success                                      IP 192.168.1.1
2026-05-25 22:44   password.changed                                   IP 10.0.0.5
2026-05-25 18:30   2fa.enabled                                        IP 10.0.0.5
2026-05-24 11:20   login.failed   email: you@example.com              IP 45.12.3.4
```

## Logged events

| Event | Meaning |
|---|---|
| `login.success` | Successful login (password only) |
| `login.success.2fa` | Successful login completed with 2FA |
| `login.failed` | Failed login attempt |
| `2fa.enabled` | 2FA was enabled on the account |
| `2fa.disabled` | 2FA was disabled on the account |
| `password.changed` | Password was changed via Settings |
| `export` | Variable values were exported — project and environment are recorded in the detail column |

The log shows your own events only and retains the last 100 entries.

## API access

`GET /api/v1/auth/audit-log`

Returns the last 100 entries as JSON. See [API Authentication](../api/authentication.md#security-audit-log) for the full response schema.
