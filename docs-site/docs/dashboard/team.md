# Team Management

## Invite a member

1. Go to **Project → Members**
2. Type the person's email address and click **Look up**
3. Confirm their name appears
4. Select a role
5. Click **Add**

!!! note
    The person must already have a dotkey account. Share your instance URL with them first so they can register.

## Roles

| Role | View secrets | Edit secrets | Delete secrets | Invite members |
|------|-------------|--------------|----------------|----------------|
| **Owner** | ✓ | ✓ | ✓ | ✓ |
| **Admin** | ✓ | ✓ | ✓ | ✓ |
| **Developer** | ✓ | ✓ | ✗ | ✗ |
| **Read-only** | ✓ | ✗ | ✗ | ✗ |

- The **owner** is the person who created the project. Only the owner can delete the project.
- **Admins** can do everything except delete the project.
- **Developers** can create and update variables but cannot delete them.
- **Read-only** members can view variable keys and pull secrets but cannot make any changes.

## Change a member's role

Open **Project → Members** → use the role dropdown next to the member's name. Changes take effect immediately.

## Remove a member

Click **🗑** next to a member. You cannot remove the owner or yourself.

## Leave a project

You cannot leave a project where you are the owner. Transfer ownership first or delete the project.
