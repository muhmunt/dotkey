# Variables

Variables are key-value pairs stored encrypted per environment. Values are **always masked** in the UI until you explicitly reveal them.

## Add a variable

Click **+ Add** in the variable table toolbar:

```
KEY   =  [ DATABASE_URL         ]
VALUE =  [ postgres://localhost  ]
              [Save]
```

Or from the CLI:

```bash
dotkey add DATABASE_URL=postgres://localhost/mydb
```

## Reveal a value

Click the **👁** icon on any row. If 2FA is enabled, you'll be prompted to enter your authenticator code first (unlocks a 15-minute reveal session).

## Copy a value

Click **📋** — the decrypted value is copied to your clipboard without displaying it on screen.

## Edit a value

Click **✏** to open an inline editor directly in the table row.

## Delete a variable

Click **🗑** — requires confirmation. Only **owners** and **admins** can delete.

## Pull (download .env)

Click **Pull** in the toolbar to download all variables for the current environment as a `.env` file. This decrypts all values — the reveal lock applies if 2FA is enabled.

## Push (upload .env)

Click **Push** to upload a local `.env` file. Variables are upserted — existing keys are updated, new keys are created. No keys are deleted.

## Search variables

Type in the **Search keys…** box to filter the table by key name.

## CLI workflow

```bash
dotkey pull development   # write .env to current directory
dotkey push staging       # push .env to server
dotkey add KEY=value      # add or update single variable
dotkey remove KEY         # delete variable
dotkey get KEY            # show decrypted value in terminal
```
