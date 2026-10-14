# Task Board — agent instructions

- Keep frontend and backend in separate folders in this monorepo.
- Browser code must call only the Next.js `/api/v1/*` proxy, never the NestJS host directly.
- Frontend stack: Next.js App Router, TypeScript, Tailwind CSS, shadcn-style primitives, Headless UI, React Query, React Hook Form, Zod, TipTap.
- Backend stack: NestJS, TypeORM, PostgreSQL. `synchronize` must always be false; schema changes belong in migrations.
- Enforce permissions in NestJS, not just in the UI. Members can only access created/assigned tasks. Disabled users must fail authorization on existing sessions.
- Never return access or refresh tokens in JSON. Access token cookie must be HttpOnly; store refresh token hashes only.
- Validate DTOs with class-validator and reject unknown fields. Validate TipTap node types and only permit http/https links.
- Never commit `.env` files, credentials, or production secrets.
- Add tests for each security rule and update README honestly when features are incomplete.
- Before claiming a task is complete, run lint, typecheck, build, migrations and automated tests where available; report commands that could not be run.
