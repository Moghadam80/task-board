# How the App Works

## Request flow

`Browser → Next.js (/api/v1/*) → NestJS (/api/v1/*) → PostgreSQL`

The browser talks to Next.js, which forwards API requests to NestJS and passes cookies back to the browser. The backend address belongs in the server-only `BACKEND_URL` variable, not in frontend code. The NestJS port should stay private.

## What lives where

- `frontend/`: Persian, right-to-left interface, forms, API proxy, and TipTap editor.
- `backend/`: authentication, permissions, task logic, database migrations, and seed data.
- `docs/`: project notes and the demo outline.

## Login and sessions

- Access cookies expire after 15 minutes; refresh cookies expire after 7 days and rotate when used.
- Both are HttpOnly cookies. Tokens are not returned in JSON, and the API does not use bearer tokens in the `Authorization` header.
- Only a hash of the refresh token is stored in the database.
- Protected requests check that the user still exists and is active. Deactivating a user also invalidates refresh-token renewal.
- Logout and session revocation use a session version so a still-valid access token can be rejected on the next request.
- Login and refresh have in-memory rate limits. These limits are per process, so a multi-instance deployment also needs limits at the proxy or API gateway.

## Roles and permissions

Permissions are checked by NestJS; hiding a button in the UI is not enough.

| Role | Permissions |
| --- | --- |
| Owner | Manage users and all tasks. The last active owner cannot be demoted or deactivated. |
| Manager | Manage and assign tasks, but cannot manage users. |
| Member | View and manage only tasks they created or are assigned to. They cannot reassign tasks to others or delete another user's task. |

Only owners can use the user-management endpoints. Owners and managers can use the separate active-user directory for assigning tasks. A member requesting a task they cannot access receives `404`, so the API does not reveal whether that task exists.

The last-owner check uses a database transaction and advisory lock to avoid two concurrent requests removing the final active owner.

## Database and task editing

- TypeORM `synchronize` is disabled. Database changes are applied through migrations.
- Task descriptions are stored as TipTap JSON in PostgreSQL `jsonb`, not as raw HTML. The API checks allowed document nodes, marks, size/depth, and link protocols (`http` and `https`).
- Task lists use server-side pagination (50 by default, 100 maximum), with search and status/assignee filters.
- The edit form sends the `updatedAt` value it loaded. If someone else has changed the task, the API returns `409 Conflict` rather than silently overwriting the newer version.
- `todo_events` keeps a history of task creation, meaningful edits, and deletion. Rich-text descriptions are not copied into the history.
- Requests have an `X-Request-Id` for troubleshooting. Logs include request details such as method, path, status, and duration, but not passwords, cookies, tokens, or request bodies.

## Frontend notes

The frontend uses Next.js App Router, TypeScript, Tailwind, React Query, React Hook Form, Zod, and Headless UI. The editor and read-only view use the same TipTap JSON structure. Public registration is disabled. React Query data is scoped by user and cleared on logout.
