import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../common/crypto/password.js';
import { CreateUserDto, UpdateUserDto } from './dto.js';
import { User, UserRole } from './user.entity.js';

/**
 * Every change that could remove an active owner takes this transaction-level
 * advisory lock first, so two concurrent requests cannot each see "another
 * owner still exists" and together remove the last two owners.
 */
const OWNER_GUARD_LOCK_KEY = 482_101;

const isUniqueViolation = (error: unknown): boolean => {
  const e = error as { code?: string; driverError?: { code?: string } };
  return (e?.driverError?.code ?? e?.code) === '23505';
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findActiveById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id, isActive: true } });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .addSelect('user.refreshTokenHash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  findByIdWithRefreshHash(id: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async list(): Promise<Partial<User>[]> {
    const users = await this.users.find({ order: { createdAt: 'DESC' } });
    return users.map((user) => this.publicUser(user));
  }

  async listDirectory(): Promise<Partial<User>[]> {
    const users = await this.users.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return users.map(({ id, name, email, role, isActive }) => ({
      id,
      name,
      email,
      role,
      isActive,
    }));
  }

  async create(dto: CreateUserDto): Promise<Partial<User>> {
    if ((dto.role as UserRole) === UserRole.OWNER) {
      throw new BadRequestException(
        'ساخت مالک فقط از طریق seed انجام می‌شود.',
      );
    }

    const email = dto.email.trim().toLowerCase();
    if (await this.users.existsBy({ email })) {
      throw new ConflictException('ایمیل قبلاً استفاده شده است.');
    }

    const user = this.users.create({
      name: dto.name.trim(),
      email,
      passwordHash: await hashPassword(dto.password),
      role: dto.role,
      isActive: true,
    });
    try {
      return this.publicUser(await this.users.save(user));
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('ایمیل قبلاً استفاده شده است.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto): Promise<Partial<User>> {
    return this.users.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1)', [
        OWNER_GUARD_LOCK_KEY,
      ]);
      const repo = manager.getRepository(User);

      const user = await repo.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('کاربر پیدا نشد.');
      }

      const nextRole = dto.role ?? user.role;
      const nextActive = dto.isActive ?? user.isActive;
      if (
        user.role === UserRole.OWNER &&
        user.isActive &&
        (nextRole !== UserRole.OWNER || !nextActive)
      ) {
        const activeOwners = await repo.count({
          where: { role: UserRole.OWNER, isActive: true },
        });
        if (activeOwners <= 1) {
          throw new ForbiddenException(
            'آخرین مالک فعال را نمی‌توان غیرفعال یا تنزل رتبه داد.',
          );
        }
      }

      if (dto.email !== undefined) {
        const email = dto.email.trim().toLowerCase();
        const duplicate = await repo.findOne({ where: { email } });
        if (duplicate && duplicate.id !== id) {
          throw new ConflictException('ایمیل قبلاً استفاده شده است.');
        }
        user.email = email;
      }
      if (dto.name !== undefined) {
        user.name = dto.name.trim();
      }
      user.role = nextRole;
      user.isActive = nextActive;

      try {
        const saved = await repo.save(user);
        if (!nextActive) {
          // Invalidate both refresh and access tokens. Incrementing the version
          // also prevents old access tokens becoming valid if this user is
          // reactivated later.
          await manager.query(
            'UPDATE "users" SET "refresh_token_hash" = NULL, "session_version" = "session_version" + 1, "updated_at" = now() WHERE "id" = $1',
            [id],
          );
        }
        return this.publicUser(saved);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictException('ایمیل قبلاً استفاده شده است.');
        }
        throw error;
      }
    });
  }

  async setRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    await this.users.update({ id }, { refreshTokenHash: hash });
  }

  async revokeSession(id: string): Promise<void> {
    await this.users.query(
      'UPDATE "users" SET "session_version" = "session_version" + 1, "refresh_token_hash" = NULL, "updated_at" = now() WHERE "id" = $1',
      [id],
    );
  }

  private publicUser(user: User): Partial<User> {
    const { id, name, email, role, isActive, createdAt, updatedAt } = user;
    return { id, name, email, role, isActive, createdAt, updatedAt };
  }
}
