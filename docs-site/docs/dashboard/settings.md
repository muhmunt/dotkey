# Account Settings

Access settings at **Settings** from the top-right user menu.

## Change your name

Hover over the **Name** row in the Account section and click the pencil icon. Type the new name and press Enter or click the checkmark.

## Change your password

1. In the **Password** section, click **Change**
2. Enter your current password
3. Enter and confirm your new password (min. 8 characters)
4. Click **Update password**

## Forgot your password?

Password reset uses your authenticator app — no email required.

1. Click **Forgot password?** on the login page
2. Enter your email address and click **Continue**
3. Open your authenticator app and enter the 6-digit code
4. Enter and confirm your new password
5. Click **Reset password**

!!! info "2FA required"
    Password reset requires an active 2FA setup. If you have also lost access to
    your backup codes, contact your instance administrator.

## Two-factor authentication

See [2FA & Reveal Lock](2fa.md) for the full guide, including backup codes and the reveal lock.

**Quick actions from Settings:**

| Action | How |
|---|---|
| View backup codes remaining | Settings → Two-Factor Authentication → count shown |
| Regenerate backup codes | Settings → Two-Factor Authentication → **Regenerate** (requires TOTP code) |
| Disable 2FA | Settings → Two-Factor Authentication → **Disable 2FA** (requires TOTP code) |

## Security log

Settings → **Security log** shows recent security events on your account.

```
Security log

2026-05-26 14:03   export         project: my-app  env: production   IP 192.168.1.1
2026-05-26 09:11   login.success                                      IP 192.168.1.1
2026-05-25 22:44   password.changed                                   IP 10.0.0.5
2026-05-25 18:30   2fa.enabled                                        IP 10.0.0.5
2026-05-24 11:20   login.failed   email: you@example.com              IP 45.12.3.4
```

**Logged events:**

| Event | Meaning |
|---|---|
| `login.success` | Successful login (password only) |
| `login.success.2fa` | Successful login completed with 2FA |
| `login.failed` | Failed login attempt |
| `2fa.enabled` | 2FA was enabled on the account |
| `2fa.disabled` | 2FA was disabled on the account |
| `password.changed` | Password was changed via Settings |
| `export` | Variable values were exported (project and environment recorded) |

The log shows your own events only and retains the last 100 entries.

## Delete account

In the **Danger zone** section:

1. Click **Delete account**
2. Enter your current password to confirm
3. Click **Permanently delete**

!!! warning "This cannot be undone"
    All your data is deleted immediately. If you are the sole owner of any
    projects, you must transfer ownership or delete those projects first.
