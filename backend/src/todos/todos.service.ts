import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EMPTY_TIPTAP_DOCUMENT,
  validateTiptapDocument,
} from '../common/validation/tiptap.js';
import { User, UserRole } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { CreateTodoDto, TodoFiltersDto, UpdateTodoDto } from './dto.js';
import { Todo, TodoPriority, TodoStatus } from './todo.entity.js';
import { TodoEvent, type TodoEventAction } from './todo-event.entity.js';

type TodoPatch = Partial<
  Pick<
    Todo,
    'title' | 'status' | 'priority' | 'description' | 'dueDate' | 'assigneeId'
  >
>;

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo) private readonly todos: Repository<Todo>,
    private readonly users: UsersService,
    @Optional() @InjectRepository(TodoEvent) private readonly events?: Repository<TodoEvent>,
  ) {}

  async list(user: User, filters: TodoFiltersDto) {
    const query = this.todos
      .createQueryBuilder('todo')
      .leftJoinAndSelect('todo.creator', 'creator')
      .leftJoinAndSelect('todo.assignee', 'assignee')
      .orderBy('todo.createdAt', 'DESC');

    // Authorization is part of the query itself: a member can never receive
    // a row they did not create or were not assigned.
    if (user.role === UserRole.MEMBER) {
      query.andWhere(
        '(todo.creatorId = :userId OR todo.assigneeId = :userId)',
        { userId: user.id },
      );
    }
    if (filters.status) {
      query.andWhere('todo.status = :status', { status: filters.status });
    }
    if (filters.assigneeId) {
      query.andWhere('todo.assigneeId = :assigneeId', {
        assigneeId: filters.assigneeId,
      });
    }
    if (filters.search) {
      query.andWhere('(todo.title ILIKE :search OR assignee.name ILIKE :search)', { search: `%${filters.search.replace(/[\\%_]/g, '\\$&')}%` });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    query.skip((page - 1) * limit).take(limit);
    const [todos, total] = await query.getManyAndCount();
    return {
      items: todos.map((todo) => this.publicTodo(todo)),
      page,
      limit,
      total,
      hasNextPage: page * limit < total,
    };
  }

  async get(id: string, user: User) {
    const todo = await this.findTodo(id);
    this.assertCanAccess(todo, user);
    return this.publicTodo(todo);
  }

  async create(dto: CreateTodoDto, user: User) {
    const assigneeId = dto.assigneeId ?? null;
    if (user.role === UserRole.MEMBER && assigneeId && assigneeId !== user.id) {
      throw new ForbiddenException(
        'شما اجازه واگذاری این وظیفه به کاربر دیگری را ندارید.',
      );
    }
    if (assigneeId && !(await this.users.findActiveById(assigneeId))) {
      throw new NotFoundException('مسئول فعال پیدا نشد.');
    }

    const description = validateTiptapDocument(
      dto.description ?? EMPTY_TIPTAP_DOCUMENT,
    );
    const todo = this.todos.create({
      title: dto.title.trim(),
      status: dto.status ?? TodoStatus.TODO,
      priority: dto.priority ?? TodoPriority.MEDIUM,
      description,
      dueDate: dto.dueDate ?? null,
      creatorId: user.id,
      assigneeId,
    });
    const saved = await this.todos.save(todo);
    await this.recordEvent(saved.id, user.id, 'created', { title: { from: null, to: saved.title }, status: { from: null, to: saved.status }, priority: { from: null, to: saved.priority }, assigneeId: { from: null, to: saved.assigneeId }, dueDate: { from: null, to: saved.dueDate } });
    return this.publicTodo(await this.findTodo(saved.id));
  }

  async update(id: string, dto: UpdateTodoDto, user: User) {
    const todo = await this.findTodo(id);
    this.assertCanAccess(todo, user);
    if (dto.expectedUpdatedAt && new Date(dto.expectedUpdatedAt).getTime() !== todo.updatedAt.getTime()) {
      throw new ConflictException('این وظیفه در همین حین توسط کاربر دیگری تغییر کرده است. اطلاعات را تازه کنید و دوباره تلاش کنید.');
    }

    const patch: TodoPatch = {};
    if (dto.title !== undefined) patch.title = dto.title.trim();
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.priority !== undefined) patch.priority = dto.priority;
    if (dto.description !== undefined) {
      patch.description = validateTiptapDocument(dto.description);
    }
    if (dto.dueDate !== undefined) patch.dueDate = dto.dueDate;

    // Only an actual change of assignee is an "assignment".
    if (dto.assigneeId !== undefined && dto.assigneeId !== todo.assigneeId) {
      if (user.role === UserRole.MEMBER) {
        const targetsSelfOrNobody =
          dto.assigneeId === null || dto.assigneeId === user.id;
        const currentIsSelfOrNobody =
          todo.assigneeId === null || todo.assigneeId === user.id;
        if (!targetsSelfOrNobody || !currentIsSelfOrNobody) {
          throw new ForbiddenException(
            'اعضا نمی‌توانند وظیفه را به کاربر دیگری واگذار کنند.',
          );
        }
      }
      if (dto.assigneeId !== null && !(await this.users.findActiveById(dto.assigneeId))) {
        throw new NotFoundException('مسئول فعال پیدا نشد.');
      }
      patch.assigneeId = dto.assigneeId;
    }

    if (Object.keys(patch).length > 0) {
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of Object.keys(patch) as Array<keyof TodoPatch>) {
        const before = key === 'assigneeId' ? todo.assigneeId : todo[key];
        const after = patch[key];
        if (JSON.stringify(before) !== JSON.stringify(after)) {
          // Do not copy rich-text content into the audit trail; record only that
          // the description changed, keeping logs small and avoiding content leaks.
          changes[key] = key === 'description'
            ? { from: before == null ? null : '[description]', to: after == null ? null : '[description]' }
            : { from: before, to: after };
        }
      }
      // update() writes the columns directly. save() on an entity that was
      // loaded together with its `assignee` relation can ignore a changed
      // `assigneeId` because the stale relation object wins.
      await this.todos.update({ id }, patch as never);
      if (Object.keys(changes).length) await this.recordEvent(id, user.id, 'updated', changes);
    }

    // Re-read without the access check: a member who just unassigned a task
    // they did not create no longer "sees" it, but the update itself succeeded.
    return this.publicTodo(await this.findTodo(id));
  }

  async remove(id: string, user: User) {
    const todo = await this.findTodo(id);
    this.assertCanAccess(todo, user);
    if (user.role === UserRole.MEMBER && todo.creatorId !== user.id) {
      throw new ForbiddenException(
        'اعضا نمی‌توانند وظایف ساخته‌شده توسط دیگران را حذف کنند.',
      );
    }

    await this.recordEvent(id, user.id, 'deleted', { title: { from: todo.title, to: null } });
    await this.todos.delete(id);
    return { success: true };
  }

  async activity(id: string, user: User) {
    const todo = await this.findTodo(id);
    this.assertCanAccess(todo, user);
    if (!this.events) return [];
    const events = await this.events.find({
      where: { todoId: id },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return events.map((event) => ({
      id: event.id,
      action: event.action,
      changes: event.changes,
      createdAt: event.createdAt,
      actor: event.actor ? { id: event.actor.id, name: event.actor.name } : null,
    }));
  }

  private async recordEvent(
    todoId: string,
    actorId: string,
    action: TodoEventAction,
    changes: Record<string, { from: unknown; to: unknown }>,
  ): Promise<void> {
    if (!this.events) return;
    await this.events.save(this.events.create({ todoId, actorId, action, changes }));
  }

  private async findTodo(id: string): Promise<Todo> {
    const todo = await this.todos.findOne({
      where: { id },
      relations: { creator: true, assignee: true },
    });
    if (!todo) {
      throw new NotFoundException('وظیفه پیدا نشد.');
    }
    return todo;
  }

  /**
   * A task the member may not access is reported as "not found" (404), not
   * "forbidden", so task ids cannot be probed for existence.
   */
  private assertCanAccess(todo: Todo, user: User) {
    if (
      user.role === UserRole.MEMBER &&
      todo.creatorId !== user.id &&
      todo.assigneeId !== user.id
    ) {
      throw new NotFoundException('وظیفه پیدا نشد.');
    }
  }

  private publicTodo(todo: Todo) {
    return {
      id: todo.id,
      title: todo.title,
      status: todo.status,
      priority: todo.priority,
      description: todo.description,
      dueDate: todo.dueDate,
      creatorId: todo.creatorId,
      assigneeId: todo.assigneeId,
      creator: todo.creator
        ? {
            id: todo.creator.id,
            name: todo.creator.name,
            email: todo.creator.email,
          }
        : undefined,
      assignee: todo.assignee
        ? {
            id: todo.assignee.id,
            name: todo.assignee.name,
            email: todo.assignee.email,
          }
        : null,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
    };
  }
}
