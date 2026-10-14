/**
 * HTTP-level tests against a REAL PostgreSQL database.
 *
 *   docker compose up -d
 *   npm run test:e2e            (from backend/)
 *
 * The database must be a dedicated one whose name ends in `_test`
 * (docker/initdb creates `taskboard_test`); the suite TRUNCATES its tables.
 */
import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuthRateLimitGuard } from '../src/common/guards/auth-rate-limit.guard.js';

const testDbUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://taskboard:dev_password_change_me@localhost:5432/taskboard_test';
if (!/_test(\?.*)?$/.test(testDbUrl)) {
  throw new Error(
    'TEST_DATABASE_URL must point to a database whose name ends with "_test"',
  );
}
// Must be set BEFORE the app module is imported (it reads DATABASE_URL on load).
process.env.DATABASE_URL = testDbUrl;
process.env.JWT_ACCESS_SECRET = 'e2e-access-secret-0123456789-0123456789';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret-0123456789-012345678';
process.env.NODE_ENV = 'test';

const { AppModule } = await import('../src/app.module.js');
const { configureApp } = await import('../src/app.setup.js');
const { AppDataSource } = await import('../src/database/data-source.js');
const { hashPassword } = await import('../src/common/crypto/password.js');
const { User, UserRole } = await import('../src/users/user.entity.js');

const PASSWORD = 'E2ePassw0rd!';
const API = '/api/v1';

describe('Task Board API (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let passwordHash: string;
  let ids: { owner: string; manager: string; member: string; member2: string };

  const http = () => app.getHttpServer();

  async function login(email: string): Promise<string[]> {
    const res = await request(http())
      .post(`${API}/auth/login`)
      .send({ email, password: PASSWORD })
      .expect(201);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    return cookies.map((c) => c.split(';')[0]);
  }
  const cookie = (jar: string[]) => jar.join('; ');
  const cookieValue = (jar: string[], name: string) =>
    jar.find((c) => c.startsWith(name + '='))?.slice(name.length + 1);

  const paragraph = (value: string) => ({
    type: 'paragraph',
    content: [{ type: 'text', text: value }],
  });

  beforeAll(async () => {
    // Schema comes from the real migrations (never `synchronize`).
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    await AppDataSource.destroy();

    const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideGuard(AuthRateLimitGuard)
.useValue({ canActivate: () => true })
  .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    ds = app.get(DataSource);
    passwordHash = await hashPassword(PASSWORD);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await ds.query('TRUNCATE TABLE "todo_events", "todos", "users" RESTART IDENTITY CASCADE');
    const repo = ds.getRepository(User);
    const make = async (
      email: string,
      name: string,
      role: (typeof UserRole)[keyof typeof UserRole],
    ) =>
      (
        await repo.save(
          repo.create({ email, name, role, passwordHash, isActive: true }),
        )
      ).id;
    ids = {
      owner: await make('owner@test.local', 'Owner', UserRole.OWNER),
      manager: await make('manager@test.local', 'Manager', UserRole.MANAGER),
      member: await make('member@test.local', 'Member', UserRole.MEMBER),
      member2: await make('member2@test.local', 'Member 2', UserRole.MEMBER),
    };
  });

  describe('required security rules', () => {
    it('1. a member cannot view another user’s tasks', async () => {
      const managerJar = await login('manager@test.local');
      const memberJar = await login('member@test.local');

      const secret = await request(http())
        .post(`${API}/todos`)
        .set('Cookie', cookie(managerJar))
        .send({ title: 'Manager-only task' })
        .expect(201);

      const own = await request(http())
        .post(`${API}/todos`)
        .set('Cookie', cookie(memberJar))
        .send({ title: 'My own task' })
        .expect(201);

      const list = await request(http())
        .get(`${API}/todos`)
        .set('Cookie', cookie(memberJar))
        .expect(200);
      expect(list.body.items.map((t: { id: string }) => t.id)).toEqual([own.body.id]);

      await request(http())
        .get(`${API}/todos/${secret.body.id}`)
        .set('Cookie', cookie(memberJar))
        .expect(404);
      await request(http())
        .patch(`${API}/todos/${secret.body.id}`)
        .set('Cookie', cookie(memberJar))
        .send({ title: 'hijacked' })
        .expect(404);
    });

    it('2. a member cannot modify users', async () => {
      const memberJar = await login('member@test.local');

      await request(http())
        .patch(`${API}/users/${ids.member}`)
        .set('Cookie', cookie(memberJar))
        .send({ role: 'owner' })
        .expect(403);
      await request(http())
        .post(`${API}/users`)
        .set('Cookie', cookie(memberJar))
        .send({
          name: 'Evil',
          email: 'evil@test.local',
          password: 'Passw0rd!Passw0rd',
          role: 'member',
        })
        .expect(403);
      await request(http())
        .get(`${API}/users`)
        .set('Cookie', cookie(memberJar))
        .expect(403);

      const row = await ds
        .getRepository(User)
        .findOneByOrFail({ id: ids.member });
      expect(row.role).toBe(UserRole.MEMBER);
    });

    it('3. a disabled user cannot use an old token (or refresh, or log in)', async () => {
      const ownerJar = await login('owner@test.local');
      const memberJar = await login('member@test.local');

      await request(http())
        .get(`${API}/auth/me`)
        .set('Cookie', cookie(memberJar))
        .expect(200);

      await request(http())
        .patch(`${API}/users/${ids.member}`)
        .set('Cookie', cookie(ownerJar))
        .send({ isActive: false })
        .expect(200);

      // the access token is still cryptographically valid and unexpired...
      await request(http())
        .get(`${API}/auth/me`)
        .set('Cookie', cookie(memberJar))
        .expect(401);
      await request(http())
        .get(`${API}/todos`)
        .set('Cookie', cookie(memberJar))
        .expect(401);
      await request(http())
        .post(`${API}/auth/refresh`)
        .set('Cookie', cookie(memberJar))
        .expect(401);
      await request(http())
        .post(`${API}/auth/login`)
        .send({ email: 'member@test.local', password: PASSWORD })
        .expect(401);

      // Re-enabling the account must not resurrect its old access token.
      await request(http())
        .patch(`${API}/users/${ids.member}`)
        .set('Cookie', cookie(ownerJar))
        .send({ isActive: true })
        .expect(200);
      await request(http())
        .get(`${API}/auth/me`)
        .set('Cookie', cookie(memberJar))
        .expect(401);
    });
  });

  describe('authentication', () => {
    it('sets HttpOnly cookies, never returns tokens in the body, stores only a hash', async () => {
      const res = await request(http())
        .post(`${API}/auth/login`)
        .send({ email: 'member@test.local', password: PASSWORD })
        .expect(201);

      const setCookie = res.headers['set-cookie'] as unknown as string[];
      expect(setCookie).toHaveLength(2);
      for (const c of setCookie) expect(c).toMatch(/HttpOnly/i);
      expect(JSON.stringify(res.body)).not.toMatch(/token|eyJ/i);

      const jar = setCookie.map((c) => c.split(';')[0]);
      const refresh = cookieValue(jar, 'refresh_token')!;
      const [row] = await ds.query(
        'SELECT refresh_token_hash FROM users WHERE email = $1',
        ['member@test.local'],
      );
      expect(row.refresh_token_hash).toMatch(/^\$argon2id\$/);
      expect(row.refresh_token_hash).not.toContain(refresh);
    });

    it('rotates the refresh token and rejects the old one', async () => {
      const jar = await login('member@test.local');
      const refreshed = await request(http())
        .post(`${API}/auth/refresh`)
        .set('Cookie', cookie(jar))
        .expect(201);
      expect(refreshed.headers['set-cookie']).toBeDefined();

      // the previous refresh token has been replaced → must fail now
      await request(http())
        .post(`${API}/auth/refresh`)
        .set('Cookie', cookie(jar))
        .expect(401);
    });

    it('logout invalidates the refresh token and existing access token', async () => {
      const jar = await login('member@test.local');
      const oldAccessCookie = jar.find((c) => c.startsWith('access_token='));
      expect(oldAccessCookie).toBeDefined();

      await request(http())
        .post(`${API}/auth/logout`)
        .set('Cookie', cookie(jar))
        .expect(201);
      await request(http())
        .post(`${API}/auth/refresh`)
        .set('Cookie', cookie(jar))
        .expect(401);

      // Clearing browser cookies is not enough: a copied, still-unexpired
      // access token must also stop working immediately after logout.
      await request(http())
        .get(`${API}/todos`)
        .set('Cookie', oldAccessCookie!)
        .expect(401);

      // Logging in again creates a new valid session.
      const freshJar = await login('member@test.local');
      await request(http())
        .get(`${API}/todos`)
        .set('Cookie', cookie(freshJar))
        .expect(200);
    });

    it('rejects wrong passwords and unauthenticated requests', async () => {
      await request(http())
        .post(`${API}/auth/login`)
        .send({ email: 'member@test.local', password: 'wrong-password' })
        .expect(401);
      await request(http()).get(`${API}/todos`).expect(401);
    });
  });

  describe('user management (owner only)', () => {
    it('the last active owner cannot be disabled or downgraded', async () => {
      const ownerJar = await login('owner@test.local');
      await request(http())
        .patch(`${API}/users/${ids.owner}`)
        .set('Cookie', cookie(ownerJar))
        .send({ isActive: false })
        .expect(403);
      await request(http())
        .patch(`${API}/users/${ids.owner}`)
        .set('Cookie', cookie(ownerJar))
        .send({ role: 'manager' })
        .expect(403);
    });

    it('an owner can be downgraded when another active owner exists', async () => {
      await ds.getRepository(User).update({ id: ids.manager }, { role: UserRole.OWNER });
      const ownerJar = await login('owner@test.local');
      await request(http())
        .patch(`${API}/users/${ids.owner}`)
        .set('Cookie', cookie(ownerJar))
        .send({ role: 'manager' })
        .expect(200);
    });

    it('cannot create an owner through the API; manager cannot manage users', async () => {
      const ownerJar = await login('owner@test.local');
      await request(http())
        .post(`${API}/users`)
        .set('Cookie', cookie(ownerJar))
        .send({
          name: 'Second Owner',
          email: 'owner2@test.local',
          password: 'Passw0rd!Passw0rd',
          role: 'owner',
        })
        .expect(400);

      const managerJar = await login('manager@test.local');
      await request(http())
        .get(`${API}/users`)
        .set('Cookie', cookie(managerJar))
        .expect(403);
      await request(http())
        .get(`${API}/users/directory`)
        .set('Cookie', cookie(managerJar))
        .expect(200);
    });
  });

  describe('tasks', () => {
    it('a member cannot assign tasks to others, nor delete others’ tasks', async () => {
      const managerJar = await login('manager@test.local');
      const memberJar = await login('member@test.local');

      await request(http())
        .post(`${API}/todos`)
        .set('Cookie', cookie(memberJar))
        .send({ title: 'give away', assigneeId: ids.manager })
        .expect(403);

      const assigned = await request(http())
        .post(`${API}/todos`)
        .set('Cookie', cookie(managerJar))
        .send({ title: 'For member', assigneeId: ids.member })
        .expect(201);

      // visible to the assignee, but they did not create it
      await request(http())
        .get(`${API}/todos/${assigned.body.id}`)
        .set('Cookie', cookie(memberJar))
        .expect(200);
      await request(http())
        .delete(`${API}/todos/${assigned.body.id}`)
        .set('Cookie', cookie(memberJar))
        .expect(403);
      await request(http())
        .patch(`${API}/todos/${assigned.body.id}`)
        .set('Cookie', cookie(memberJar))
        .send({ assigneeId: ids.member2 })
        .expect(403);

      await request(http())
        .delete(`${API}/todos/${assigned.body.id}`)
        .set('Cookie', cookie(managerJar))
        .expect(200);
    });

    it('a manager can create, reassign (really persisted), filter and delete', async () => {
      const managerJar = await login('manager@test.local');
      const created = await request(http())
        .post(`${API}/todos`)
        .set('Cookie', cookie(managerJar))
        .send({ title: 'Task', assigneeId: ids.member, status: 'in_progress' })
        .expect(201);

      const moved = await request(http())
        .patch(`${API}/todos/${created.body.id}`)
        .set('Cookie', cookie(managerJar))
        .send({ assigneeId: ids.member2, dueDate: '2026-12-31' })
        .expect(200);
      expect(moved.body.assigneeId).toBe(ids.member2);
      expect(moved.body.assignee.id).toBe(ids.member2);
      expect(moved.body.dueDate).toBe('2026-12-31');

      const filtered = await request(http())
        .get(`${API}/todos?status=in_progress&assigneeId=${ids.member2}`)
        .set('Cookie', cookie(managerJar))
        .expect(200);
      expect(filtered.body.items).toHaveLength(1);
      const none = await request(http())
        .get(`${API}/todos?status=done`)
        .set('Cookie', cookie(managerJar))
        .expect(200);
      expect(none.body.items).toHaveLength(0);

      await request(http())
        .delete(`${API}/todos/${created.body.id}`)
        .set('Cookie', cookie(managerJar))
        .expect(200);
    });

    it('rejects unknown fields, null titles and impossible dates', async () => {
      const jar = await login('manager@test.local');
      const post = (body: object) =>
        request(http()).post(`${API}/todos`).set('Cookie', cookie(jar)).send(body);

      await post({ title: 'x', hacker: true }).expect(400);
      await post({ title: '   ' }).expect(400);
      await post({ title: 'x', dueDate: '2026-02-30' }).expect(400);

      const ok = await post({ title: 'ok' }).expect(201);
      await request(http())
        .patch(`${API}/todos/${ok.body.id}`)
        .set('Cookie', cookie(jar))
        .send({ title: null })
        .expect(400);
    });
  });

  it('records task activity in chronological order', async () => {
    const jar = await login('manager@test.local');
    const created = await request(http())
      .post(`${API}/todos`)
      .set('Cookie', cookie(jar))
      .send({ title: 'Activity timeline task' })
      .expect(201);
    await request(http())
      .patch(`${API}/todos/${created.body.id}`)
      .set('Cookie', cookie(jar))
      .send({ status: 'in_progress' })
      .expect(200);
    const activity = await request(http())
      .get(`${API}/todos/${created.body.id}/activity`)
      .set('Cookie', cookie(jar))
      .expect(200);
    expect(activity.body.map((event: { action: string }) => event.action)).toEqual(['updated', 'created']);
    expect(activity.body[0].changes.status.to).toBe('in_progress');
    const memberJar = await login('member@test.local');
    await request(http())
      .get(`${API}/todos/${created.body.id}/activity`)
      .set('Cookie', cookie(memberJar))
      .expect(404);
    await request(http())
      .patch(`${API}/todos/${created.body.id}`)
      .set('Cookie', cookie(jar))
      .send({ title: 'stale edit', expectedUpdatedAt: created.body.updatedAt })
      .expect(409);
  });

  describe('TipTap description (jsonb)', () => {
    it('stores and restores the exact JSON document', async () => {
      const jar = await login('member@test.local');
      const description = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'عنوان' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'پررنگ', marks: [{ type: 'bold' }] },
              {
                type: 'text',
                text: ' لینک',
                marks: [
                  {
                    type: 'link',
                    attrs: {
                      href: 'https://example.com',
                      target: '_blank',
                      rel: 'noopener noreferrer',
                      class: null,
                    },
                  },
                ],
              },
            ],
          },
          {
            type: 'bulletList',
            content: [{ type: 'listItem', content: [paragraph('یک')] }],
          },
        ],
      };

      const created = await request(http())
        .post(`${API}/todos`)
        .set('Cookie', cookie(jar))
        .send({ title: 'rich', description })
        .expect(201);
      const fetched = await request(http())
        .get(`${API}/todos/${created.body.id}`)
        .set('Cookie', cookie(jar))
        .expect(200);
      expect(fetched.body.description).toEqual(description);

      const [row] = await ds.query(
        'SELECT jsonb_typeof(description) AS t FROM todos WHERE id = $1',
        [created.body.id],
      );
      expect(row.t).toBe('object');
    });

    it('accepts an empty document and rejects unsafe/unknown content', async () => {
      const jar = await login('member@test.local');
      const post = (description: unknown) =>
        request(http())
          .post(`${API}/todos`)
          .set('Cookie', cookie(jar))
          .send({ title: 't', description });

      await post({ type: 'doc' }).expect(201);
      await post({ type: 'doc', content: [] }).expect(201);
      await post({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'x',
                marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
              },
            ],
          },
        ],
      }).expect(400);
      await post({ type: 'doc', content: [{ type: 'script' }] }).expect(400);
      await post('<p>html is not accepted</p>').expect(400);
    });
  });
});
