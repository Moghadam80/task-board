## Monorepo Structure

```text
task-board/
├── frontend/           # Next.js App Router
├── backend/            # NestJS + TypeORM
├── docs/               # Architecture, AI workflow
├── docker-compose.yml  # PostgreSQL 16
├── AGENTS.md           # Agent instructions
└── README.md
```

- `frontend/`: Next.js App Router, TypeScript, Tailwind CSS, Headless UI, React Query, React Hook Form, Zod, and TipTap.
- `backend/`: NestJS, TypeORM, PostgreSQL, migrations, seed scripts, and security tests.
- The browser never communicates directly with NestJS. All client requests go through the `/api/v1/*` routes in Next.js.

## Prerequisites

- Node.js 20 or later
- npm
- Docker Desktop for PostgreSQL, or a compatible local PostgreSQL instance

## Getting Started with Docker Compose

Run these commands from the repository root.

### PowerShell

```powershell
docker compose up -d

if (!(Test-Path backend/.env)) {
    Copy-Item backend/.env.example backend/.env
}

if (!(Test-Path frontend/.env.local)) {
    Copy-Item frontend/.env.example frontend/.env.local
}
```

### Bash (Linux/macOS)

```bash
docker compose up -d

test -f backend/.env || cp backend/.env.example backend/.env
test -f frontend/.env.local || cp frontend/.env.example frontend/.env.local
```

Review both environment files and configure the required values before starting the application.

Replace `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` with independently generated random secrets of at least 32 characters. Never use production secrets in source control.

The default `DATABASE_URL` for a backend running directly on the host is:

```text
postgresql://taskboard:dev_password_change_me@localhost:5433/taskboard
```

The Compose configuration maps host port `5433` to PostgreSQL's container port `5432` and binds it to `127.0.0.1`.

If the backend runs inside Docker instead of on the host, configure the database URL to use the Compose service name and container port, as appropriate for the Docker network.

`BACKEND_URL` is used only by the Next.js server and is not exposed directly to the browser.

## Database Migrations and Seeding

From the repository root, run the following commands.

```powershell
cd backend
npm install
npm run migration:run
npm run seed
npm run start:dev
```

The seed script creates the initial owner, manager, and member accounts if they do not already exist. Existing users are not overwritten, and sample tasks are created only when the task table is empty.

The initial owner is created through the seed process; creating an owner through the UI or API is not permitted.

To revert the most recently applied migration:

```powershell
npm run migration:revert
```

Use this command carefully, because reverting a migration may alter or remove database structures or data.

## Frontend

Open a second terminal from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The backend API is available at `http://localhost:3001/api/v1` when NestJS is configured to use port `3001`. The browser must not call this address directly; client requests should use the Next.js `/api/v1/*` routes.

## Demo Accounts

The seed script uses the following default credentials when the corresponding `SEED_*` environment variables are not set.

| Role | Email | Default local password |
|---|---|---|
| Owner | `owner@taskboard.local` | `OwnerPass123!` |
| Manager | `manager@taskboard.local` | `ManagerPass123!` |
| Member | `member@taskboard.local` | `MemberPass123!` |

These credentials are for local development only. Change them before exposing the application beyond your local machine. Do not use these passwords in production.

There is no public registration.

The owner can create managers and members, change their roles, and deactivate users. The last active owner cannot be deactivated or demoted.

## Architecture and Security Decisions

See [docs/architecture.md](docs/architecture.md) for architecture details and [docs/decisions.md](docs/decisions.md) for recorded decisions.

- Access tokens are stored in HttpOnly cookies. Refresh tokens are stored in the database only as Argon2id hashes.
- TypeORM `synchronize` is disabled. Database schema changes are managed through migrations.
- Members can see only tasks they created or tasks assigned to them.
- Inactive users cannot log in, and their existing access tokens are rejected by `JwtAuthGuard`.
- Logging out increments `session_version`, causing previously issued access tokens to be rejected by the guard immediately, even if they have not expired. If the refresh token is missing, expired, or invalid but the access token remains valid, logout uses the access token to revoke the session.
- `GET /users` is restricted to the owner. `GET /users/directory` provides active-user options to owners and managers for task assignment. Members cannot assign tasks.
- When a member is not allowed to view a task, the API returns `404` instead of `403` to avoid disclosing whether the task ID exists.
- A PostgreSQL advisory lock inside a transaction protects the last active owner from concurrent deactivation or demotion requests.
- TipTap content is stored as JSON in PostgreSQL `jsonb`. HTML is not the source of truth. Links are restricted to `http` and `https` URLs.
- Task lists are paginated and support server-side search, with a maximum of 100 records per page.
- The edit form submits the expected `updatedAt` value. If a task changes after the form is opened but before it is saved, the API returns `409 Conflict` to prevent silent overwrites.
- Every request receives an `X-Request-Id`. Structured logs include the request ID, path, method, status code, and duration. Request bodies, cookies, and login credentials are not logged.
- Task history is stored in `todo_events`. Deletion events are retained when tasks are deleted. Authorized users can view task activity through `GET /todos/:id/activity`.
- Login and refresh endpoints use process-local rate limiting. Multi-instance deployments also require distributed rate limiting at the reverse proxy or API gateway.
- NestJS listens on `127.0.0.1` by default. For access within a private container network, configure `HOST=0.0.0.0` as needed, and do not expose the backend port directly to the public internet.

## Quality Checks

Run the following commands from the repository root.

### Frontend

```powershell
cd frontend
npm run typecheck
npm run lint
npm run build
```

### Backend

```powershell
cd ../backend
npm run typecheck
npm run test
npm run lint
npm run build
```

The repository root also supports `npm run test`, `npm run lint`, `npm run typecheck`, and `npm run build`, provided the root scripts and dependencies are configured accordingly.

### Testing Levels

**Unit tests**

Run `npm test` in `backend/`. These tests are designed to run quickly without a database.

**End-to-end tests**

Run `npm run test:e2e` in `backend/`. These tests exercise HTTP endpoints against a real PostgreSQL database and use `unplugin-swc` to provide the decorator metadata required by NestJS.

E2E tests require a separate database whose name ends with `_test`. The Compose initialization scripts create `taskboard_test` only when the PostgreSQL data volume is initialized for the first time.

If the database was not created because the volume already existed, create it with:

```powershell
docker compose exec postgres createdb -U taskboard -O taskboard taskboard_test
```

Ensure that the E2E test configuration explicitly targets the test database. Never run E2E tests against your development or production database.

The test suites cover these core requirements:

1. Members cannot view another user's tasks.
2. Members cannot modify user accounts.
3. Inactive users cannot access the API with previously issued tokens. The E2E test resends the same old cookie to verify this behavior.

The E2E suite also checks HttpOnly cookies, refresh-token hash storage, refresh-token rotation, last-owner protections, member task assignment and deletion restrictions, rejection of unknown fields, and TipTap JSON round-tripping.

## Development Tools and AI Workflow

Development used Cursor Agent and the project rules in `AGENTS.md` and `.cursor/rules/task-board.mdc`.

The review process, affected files, and known limitations are documented in [docs/ai-workflow.md](docs/ai-workflow.md).
