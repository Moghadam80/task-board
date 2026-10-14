# Main Technical Decisions

## 1. Keep API requests behind Next.js

**Choice:** The browser calls Next.js at `/api/v1/*`; Next.js forwards requests to NestJS and passes cookies through.

**Reason:** The backend address stays out of browser code and cookie handling stays same-origin. The trade-off is an extra network hop and a server-side `BACKEND_URL` that must be configured correctly.

## 2. Use HttpOnly cookies and session versioning

**Choice:** Short-lived access tokens and rotating refresh tokens are stored in HttpOnly cookies. The database stores only the refresh-token hash. Protected requests check the user's active state and session version.

**Reason:** This supports safer browser sessions and allows logout or account deactivation to revoke access before a token naturally expires. The trade-off is a database lookup on protected requests.

## 3. Store TipTap content as JSON

**Choice:** Save the editor document in PostgreSQL `jsonb`, validate its structure in NestJS, and use the same document for editing and read-only display.

**Reason:** Structured content is easier to validate than treating HTML as the source of truth. When editor extensions change, the API allow-list and tests must be updated too.

## 4. Enforce permissions on the server

**Choice:** NestJS checks role and task ownership for every protected action. Members can access only tasks they created or were assigned; owners and managers have broader task permissions, while user management is owner-only.

**Reason:** UI restrictions alone are not security controls. The last active owner is protected with a transaction and advisory lock to avoid conflicting changes.

## 5. Protect task history and concurrent edits

**Choice:** Important task changes are recorded in `todo_events`. Updates include the version the user originally loaded; stale edits return `409 Conflict`.

**Reason:** The history helps explain what changed, and version checks prevent a newer edit from being silently overwritten. In a larger production system, task changes and history writes should be committed in the same database transaction.

## 6. Keep operational limits clear

**Choice:** Task lists are paginated on the server, and login/refresh rate limits run in application memory. Request IDs help connect errors with logs without logging credentials or tokens.

**Trade-off:** In-memory rate limits are not shared between server instances and reset on restart. Production deployments should add distributed limits and centralized log collection.
