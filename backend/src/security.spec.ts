import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { AuthRateLimitGuard } from './common/guards/auth-rate-limit.guard.js';
import { AuthService } from './auth/auth.service.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { validateTiptapDocument } from './common/validation/tiptap.js';
import { TodosService } from './todos/todos.service.js';
import { UserRole } from './users/user.entity.js';
import { UsersService } from './users/users.service.js';

/**
 * Fast unit tests (no database). The same rules are exercised end-to-end over
 * HTTP in test/app.e2e-spec.ts.
 */

const member = { id: 'member-id', role: UserRole.MEMBER } as const;
const manager = { id: 'manager-id', role: UserRole.MANAGER } as const;
const otherTask = {
  id: 'task-id',
  title: 'Private task',
  creatorId: 'other-user',
  assigneeId: null,
  creator: { id: 'other-user', name: 'Other', email: 'other@example.test' },
  assignee: null,
};

describe('required security rules', () => {
  it('1. Member cannot view another user’s task', async () => {
    const repository = { findOne: vi.fn().mockResolvedValue(otherTask) };
    const service = new TodosService(
      repository as never,
      { findActiveById: vi.fn() } as never,
    );
    await expect(
      service.get('task-id', member as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('2. Member cannot modify users', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([UserRole.OWNER]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: member }) }),
    } as never;
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('3. Disabled user cannot use an old access token', async () => {
    const jwt = {
      verifyAsync: vi
        .fn()
        .mockResolvedValue({ sub: 'disabled-id', typ: 'access' }),
    };
    // findActiveById only returns users with isActive = true
    const users = { findActiveById: vi.fn().mockResolvedValue(null) };
    const guard = new JwtAuthGuard(jwt as never, users as never);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          cookies: { access_token: 'old-but-still-valid-token' },
          headers: {},
        }),
      }),
    } as never;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(users.findActiveById).toHaveBeenCalledWith('disabled-id');
  });
});

describe('task authorization', () => {
  it('Member cannot assign a task to another user', async () => {
    const service = new TodosService(
      {} as never,
      { findActiveById: vi.fn() } as never,
    );
    await expect(
      service.create(
        { title: 'Secret', assigneeId: 'someone-else' },
        member as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Member cannot delete a task created by someone else', async () => {
    const assignedToMember = { ...otherTask, assigneeId: member.id };
    const repository = {
      findOne: vi.fn().mockResolvedValue(assignedToMember),
      delete: vi.fn(),
    };
    const service = new TodosService(repository as never, {} as never);
    await expect(
      service.remove('task-id', member as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('Member can edit a task whose (other) assignee is unchanged', async () => {
    const task = {
      ...otherTask,
      creatorId: member.id,
      assigneeId: 'manager-id',
    };
    const repository = {
      findOne: vi.fn().mockResolvedValue(task),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const service = new TodosService(repository as never, {} as never);
    await expect(
      service.update(
        'task-id',
        { title: 'New title', assigneeId: 'manager-id' },
        member as never,
      ),
    ).resolves.toBeDefined();
    expect(repository.update).toHaveBeenCalledWith(
      { id: 'task-id' },
      { title: 'New title' },
    );
  });

  it('Member cannot hand a task over to another user via update', async () => {
    const task = { ...otherTask, creatorId: member.id, assigneeId: null };
    const repository = {
      findOne: vi.fn().mockResolvedValue(task),
      update: vi.fn(),
    };
    const service = new TodosService(
      repository as never,
      { findActiveById: vi.fn().mockResolvedValue({ id: 'x' }) } as never,
    );
    await expect(
      service.update('task-id', { assigneeId: 'x' }, member as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('Manager can reassign any task', async () => {
    const repository = {
      findOne: vi.fn().mockResolvedValue(otherTask),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const service = new TodosService(
      repository as never,
      { findActiveById: vi.fn().mockResolvedValue({ id: 'm2' }) } as never,
    );
    await service.update('task-id', { assigneeId: 'm2' }, manager as never);
    expect(repository.update).toHaveBeenCalledWith(
      { id: 'task-id' },
      { assigneeId: 'm2' },
    );
  });

  it('Member list queries are scoped to created or assigned tasks', async () => {
    const query = {
  leftJoinAndSelect: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  take: vi.fn().mockReturnThis(),
  getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
};
    const repository = {
      createQueryBuilder: vi.fn().mockReturnValue(query),
    };
    const service = new TodosService(repository as never, {} as never);
    await service.list(member as never, {});
    expect(query.andWhere).toHaveBeenCalledWith(
      '(todo.creatorId = :userId OR todo.assigneeId = :userId)',
      { userId: member.id },
    );
  });
});

describe('user management', () => {
  it('API cannot create an owner user', async () => {
    const repository = { existsBy: vi.fn(), create: vi.fn(), save: vi.fn() };
    const service = new UsersService(repository as never);
    await expect(
      service.create({
        name: 'New Owner',
        email: 'new-owner@taskboard.local',
        password: 'OwnerPass123!',
        role: UserRole.OWNER,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('owner protection', () => {
  it('The last active owner cannot be disabled or downgraded', async () => {
    const owner = {
      id: 'owner-id',
      role: UserRole.OWNER,
      isActive: true,
      name: 'Owner',
      email: 'owner@taskboard.local',
    };
    const txRepo = {
      findOne: vi.fn().mockResolvedValue(owner),
      count: vi.fn().mockResolvedValue(1),
      save: vi.fn(),
      update: vi.fn(),
    };
    const manager = {
      query: vi.fn().mockResolvedValue(undefined),
      getRepository: () => txRepo,
    };
    const repository = {
      manager: { transaction: (cb: (m: typeof manager) => unknown) => cb(manager) },
    };
    const service = new UsersService(repository as never);
    await expect(
      service.update('owner-id', { isActive: false }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.update('owner-id', { role: UserRole.MANAGER }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(txRepo.save).not.toHaveBeenCalled();
    expect(manager.query).toHaveBeenCalled(); // advisory lock was taken
  });
});

const doc = (...content: unknown[]) => ({ type: 'doc', content });
const para = (...content: unknown[]) => ({ type: 'paragraph', content });
const text = (value: string, marks?: unknown[]) => ({
  type: 'text',
  text: value,
  ...(marks ? { marks } : {}),
});

describe('TipTap validation', () => {
  it('rejects javascript: / data: links and non-URL hrefs', () => {
    for (const href of ['javascript:alert(1)', 'data:text/html,x', 'not a url']) {
      expect(() =>
        validateTiptapDocument(
          doc(para(text('bad', [{ type: 'link', attrs: { href } }]))),
        ),
      ).toThrow();
    }
  });

  it('accepts http and https links as TipTap emits them', () => {
    const link = {
      type: 'link',
      attrs: {
        href: 'https://example.com/a?b=c',
        target: '_blank',
        rel: 'noopener noreferrer',
        class: null,
      },
    };
    expect(() =>
      validateTiptapDocument(doc(para(text('ok', [link])))),
    ).not.toThrow();
    expect(() =>
      validateTiptapDocument(
        doc(
          para(
            text('ok', [{ type: 'link', attrs: { href: 'http://example.com' } }]),
          ),
        ),
      ),
    ).not.toThrow();
  });

  it('rejects unknown nodes, marks, attributes and node keys', () => {
    expect(() => validateTiptapDocument(doc({ type: 'iframe' }))).toThrow();
    expect(() =>
      validateTiptapDocument(doc(para(text('x', [{ type: 'underline' }])))),
    ).toThrow();
    expect(() =>
      validateTiptapDocument(
        doc({ type: 'paragraph', attrs: { onclick: 'x' } }),
      ),
    ).toThrow();
    expect(() =>
      validateTiptapDocument(
        doc({ type: 'paragraph', content: [], html: '<b>x</b>' }),
      ),
    ).toThrow();
  });

  it('enforces heading levels 1-3 and structural rules', () => {
    const heading = (level: number) => ({
      type: 'heading',
      attrs: { level },
      content: [text('h')],
    });
    expect(() => validateTiptapDocument(doc(heading(3)))).not.toThrow();
    expect(() => validateTiptapDocument(doc(heading(4)))).toThrow();
    // text directly under doc / listItem directly under doc are not allowed
    expect(() => validateTiptapDocument(doc(text('loose')))).toThrow();
    expect(() => validateTiptapDocument(doc({ type: 'listItem' }))).toThrow();
  });

  it('accepts lists, blockquotes, bold/italic and hard breaks', () => {
    expect(() =>
      validateTiptapDocument(
        doc(
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [para(text('a', [{ type: 'bold' }, { type: 'italic' }]))],
              },
            ],
          },
          {
            type: 'orderedList',
            attrs: { start: 1, type: null },
            content: [{ type: 'listItem', content: [para(text('b'))] }],
          },
          { type: 'blockquote', content: [para(text('q'), { type: 'hardBreak' })] },
        ),
      ),
    ).not.toThrow();
  });

  it('accepts empty documents', () => {
    expect(() => validateTiptapDocument({ type: 'doc' })).not.toThrow();
    expect(() =>
      validateTiptapDocument({ type: 'doc', content: [] }),
    ).not.toThrow();
    expect(() =>
      validateTiptapDocument({ type: 'doc', content: [{ type: 'paragraph' }] }),
    ).not.toThrow();
  });

  it('rejects non-documents', () => {
    for (const value of [null, 'text', [], { type: 'paragraph' }]) {
      expect(() => validateTiptapDocument(value)).toThrow();
    }
  });
});


describe('auth hardening', () => {
  it('limits repeated login attempts from one source address', () => {
    const guard = new AuthRateLimitGuard();
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ path: '/api/v1/auth/login', ip: '127.0.0.1', socket: {} }) }),
    } as never;
    for (let i = 0; i < 10; i++) expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow();
  });

  it('revokes the active session on logout when refresh token is invalid but access token is valid', async () => {
    const jwt = {
      verifyAsync: vi.fn()
        .mockRejectedValueOnce(new Error('expired refresh'))
        .mockResolvedValueOnce({ sub: 'user-1', typ: 'access', sv: 0 }),
    };
    const users = {
      findActiveById: vi.fn().mockResolvedValue({ id: 'user-1', isActive: true, sessionVersion: 0 }),
      revokeSession: vi.fn().mockResolvedValue(undefined),
    };
    const response = { clearCookie: vi.fn() };
    const service = new AuthService(jwt as never, users as never);
    await service.logout('expired-refresh', response as never, 'valid-access');
    expect(users.revokeSession).toHaveBeenCalledWith('user-1');
    expect(response.clearCookie).toHaveBeenCalledTimes(2);
  });

  it('does not let a stale access cookie revoke a newer session', async () => {
    const jwt = {
      verifyAsync: vi.fn()
        .mockRejectedValueOnce(new Error('expired refresh'))
        .mockResolvedValueOnce({ sub: 'user-1', typ: 'access', sv: 1 }),
    };
    const users = {
      findActiveById: vi.fn().mockResolvedValue({ id: 'user-1', isActive: true, sessionVersion: 2 }),
      revokeSession: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(jwt as never, users as never);
    await service.logout('expired-refresh', { clearCookie: vi.fn() } as never, 'stale-access');
    expect(users.revokeSession).not.toHaveBeenCalled();
  });
});
