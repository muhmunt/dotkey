# Projects

A **project** maps to one repository or service. Each project contains environments and their variables.

## Create a project

Click **+ New Project** on the projects page, or use the CLI:

```bash
dotkey project create
```

You can also create a project from the welcome onboarding flow after registration.

## Project roles

Every project member has one of four roles:

| Role | View | Edit | Delete | Invite |
|------|------|------|--------|--------|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ |
| Developer | ✓ | ✓ | ✗ | ✗ |
| Read-only | ✓ | ✗ | ✗ | ✗ |

## Project sub-navigation

Inside a project you have access to:

- **Environments** — manage secret values per environment
- **Diff** — compare two environments side by side
- **History** — project-wide audit log of all changes
- **Activity** — timeline of who changed what and when
- **Members** — invite teammates and manage roles
- **Tokens** — CI/CD project tokens that don't expire
- **Integrations** — copy-paste snippets for GitHub Actions, Docker, etc.
- **Settings** — rename, describe, or delete the project

## Delete a project

Only the **owner** can delete a project. Open **Settings → Danger Zone**, type the project name to confirm, and click **Delete Project**.

!!! warning
    Deleting a project permanently removes all environments, variables, and version history. This cannot be undone.
