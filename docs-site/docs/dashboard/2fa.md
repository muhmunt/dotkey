# 2FA & Reveal Lock

dotkey has two layers of 2FA protection:

1. **Login 2FA** — required every time you sign in
2. **Reveal lock** — required every time you want to view secret values (15-minute session)

!!! info "2FA is mandatory"
    All accounts must have 2FA enabled. You are prompted to set it up immediately
    after registering — the dashboard is not accessible until setup is complete.

## Setting up 2FA

2FA is set up automatically during registration. You are redirected to the setup
flow right after creating your account:

1. Click **Set up 2FA** on the onboarding screen
2. Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
3. Enter the 6-digit code shown in your app to confirm
4. 2FA is now enabled — you are taken to the dashboard

If you ever disable 2FA and want to re-enable it:

1. Go to **Settings → Two-Factor Authentication**
2. Click **Set up 2FA** and follow the same steps above

## Login with 2FA

After entering your email and password, you'll see a second screen:

```
Two-factor authentication

Enter the 6-digit code from your authenticator app.

[  000 000  ]
[   Verify  ]
```

## Reveal lock

When 2FA is enabled, all secret values are locked by default — even after login.

To reveal values:

1. Click **👁** on any variable row
2. The reveal lock modal opens:

```
Unlock Secrets

Enter your authenticator code to reveal secret values.
Session stays open for 15 minutes.

[  000000  ]
[  Unlock  ] [Cancel]
```

3. Enter your 6-digit code → values are visible for **15 minutes**
4. A countdown timer appears in the toolbar showing the remaining time
5. Click the timer to manually lock the session

## Reveal lock indicator

While unlocked:

```
🔓 12:34   ← click to lock manually
```

While locked:

```
🔒 Locked  ← click to unlock
```

## Disable 2FA

1. Go to **Settings → Two-Factor Authentication**
2. Click **Disable 2FA**
3. Enter your current authenticator code to confirm

## CLI and 2FA

The CLI uses a device flow (browser approval) that handles 2FA at login time. CLI pull commands don't require the reveal lock — CI pipelines use project tokens instead.

See [API Tokens](tokens.md) for non-personal CI authentication.
