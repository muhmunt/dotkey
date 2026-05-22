# CLI Commands

## Auth

```bash
dotkey login      # authenticate via browser (device flow)
dotkey logout     # remove local credentials
dotkey whoami     # show current logged-in user
```

## Projects

```bash
dotkey projects           # list all projects
dotkey project create     # create a new project (interactive)
dotkey project use NAME   # set active project
dotkey project info       # show active project details
```

## Environments

```bash
dotkey envs               # list environments in active project
dotkey env create NAME    # create a new environment
dotkey env use NAME       # set active environment
dotkey env delete NAME    # delete an environment
```

## Variables

```bash
dotkey pull [env]             # pull secrets → write .env file
dotkey push [env]             # push local .env → server
dotkey add KEY=VALUE          # add or update a single variable
dotkey remove KEY             # delete a variable
dotkey get KEY                # show decrypted value of one key
dotkey list [env]             # list variable keys (values masked)
dotkey sync                   # push local .env then pull from server
```

## Diff & History

```bash
dotkey diff dev prod          # compare two environments
dotkey history [env]          # show change history
dotkey rollback VERSION_ID    # restore a variable to a previous value
```

## Global flags

```bash
--project, -p    override active project (name or ID)
--env, -e        override active environment (name or ID)
--api            override API base URL
--web            override web dashboard URL
--token          override auth token (useful in CI)
--quiet, -q      suppress output except errors
```

## CI usage

```bash
dotkey pull production --token $DOTKEY_TOKEN
# or via env var
DOTKEY_TOKEN=xxx dotkey pull production
```
