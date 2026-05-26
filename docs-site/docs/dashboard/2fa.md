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
4. **Save your backup codes** — shown once immediately after setup (see below)
5. 2FA is now enabled — you are taken to the dashboard

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

Use a backup code instead
```

## Backup codes

When you first enable 2FA, dotkey generates **8 one-time backup codes**. These let you log in if you lose access to your authenticator app.

```
Your backup codes

Save these somewhere safe. Each code can only be used once.

  ABCD-EFGH      WXYZ-1234
  MNPQ-5678      RSTU-9012
  VWXY-3456      BCDE-7890
  FGHJ-1234      KLMN-5678

[📋 Copy all]   [⬇ Download]
```

**Important:**

- Each code is single-use — once used it cannot be used again
- Codes do not expire
- If you run out of codes, regenerate them from Settings before you need them
- Store codes in a password manager, printed paper, or another secure location

### Using a backup code to log in

On the 2FA login screen, click **Use a backup code instead**:

```
Backup code

Enter one of your 8-character recovery codes.

[  ABCD-EFGH  ]
[   Verify    ]

← Use authenticator app instead
```

The code is consumed on use. The remaining count decreases by one.

### Checking remaining codes

In **Settings → Two-Factor Authentication** you can see how many codes are left:

```
Backup codes     5 remaining    [Regenerate]
```

### Regenerating backup codes

If you run low, or suspect a code was compromised:

1. Go to **Settings → Two-Factor Authentication**
2. Click **Regenerate**
3. Enter your current authenticator code to confirm
4. All previous codes are immediately invalidated
5. 8 new codes are shown — save them now

!!! warning
    Regenerating invalidates all existing backup codes immediately.
    Make sure you save the new ones before closing the dialog.

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

!!! warning
    Disabling 2FA also deletes all your backup codes. If you re-enable 2FA
    later, a new set of codes is generated.

## Lost your authenticator?

Use a backup code to log in (see above). Once logged in, go to **Settings** to disable 2FA and then re-enable it with your new device.

If you have no backup codes left, contact your instance administrator — they can reset your account directly in the database.

## CLI and 2FA

The CLI uses a device flow (browser approval) that handles 2FA at login time. CLI pull commands don't require the reveal lock — CI pipelines use project tokens instead.

See [API Tokens](tokens.md) for non-personal CI authentication.
