# Environments

Environments represent deployment contexts within a project — typically `development`, `staging`, and `production`.

## Create an environment

Click the **+** button next to "Environments" in the project sidebar, or:

```bash
dotkey env create production
```

## Rename an environment

Hover over the environment name in the sidebar → click the pencil icon → type new name → press `Enter`.

## Lock an environment

Hover over an environment in the sidebar → click the lock icon. When locked:

- All edits, imports, and deletes are disabled
- The lock icon appears next to the environment name
- A yellow banner shows on the variable page

Unlock by clicking the icon again. Only **owners** and **admins** can lock/unlock.

!!! tip
    Lock `production` to prevent accidental edits. Unlock it only when you intentionally need to make changes.

## Delete an environment

Hover over the environment → lock icon becomes visible → right-click or use the rename flow → select Delete.

!!! warning
    Deleting an environment permanently removes all its variables and version history.

## Switch environments

Click any environment name in the sidebar. Or from the CLI:

```bash
dotkey env use staging
```
