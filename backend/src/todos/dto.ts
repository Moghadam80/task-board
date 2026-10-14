import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  MaxLength,
  MinLength,
  IsInt,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsCalendarDate } from '../common/validation/calendar-date.js';
import { TodoPriority, TodoStatus } from './todo.entity.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Validate unless the property is omitted (so an explicit `null` is rejected). */
const notUndefined = (_dto: unknown, value: unknown) => value !== undefined;

export class CreateTodoDto {
  @Transform(trim)
  @IsString({ message: 'عنوان باید متن باشد.' })
  @MinLength(1, { message: 'عنوان وظیفه لازم است.' })
  @MaxLength(180, { message: 'عنوان بیش از حد طولانی است.' })
  title!: string;

  @IsOptional()
  @IsEnum(TodoStatus, { message: 'وضعیت معتبر نیست.' })
  status?: TodoStatus;

  @IsOptional()
  @IsEnum(TodoPriority, { message: 'اولویت معتبر نیست.' })
  priority?: TodoPriority;

  @IsOptional()
  @IsObject({ message: 'توضیحات باید یک شیء JSON باشد.' })
  description?: Record<string, unknown>;

  @IsOptional()
  @IsUUID('4', { message: 'شناسه مسئول معتبر نیست.' })
  assigneeId?: string | null;

  @IsOptional()
  @IsCalendarDate()
  dueDate?: string | null;
}

export class UpdateTodoDto {
  /** Optional optimistic concurrency token supplied by the task detail form. */
  @IsOptional()
  @IsDateString({}, { message: 'نسخهٔ وظیفه معتبر نیست.' })
  expectedUpdatedAt?: string;

  @ValidateIf(notUndefined)
  @Transform(trim)
  @IsString({ message: 'عنوان باید متن باشد.' })
  @MinLength(1, { message: 'عنوان وظیفه لازم است.' })
  @MaxLength(180, { message: 'عنوان بیش از حد طولانی است.' })
  title?: string;

  @ValidateIf(notUndefined)
  @IsEnum(TodoStatus, { message: 'وضعیت معتبر نیست.' })
  status?: TodoStatus;

  @ValidateIf(notUndefined)
  @IsEnum(TodoPriority, { message: 'اولویت معتبر نیست.' })
  priority?: TodoPriority;

  @ValidateIf(notUndefined)
  @IsObject({ message: 'توضیحات باید یک شیء JSON باشد.' })
  description?: Record<string, unknown>;

  /** `null` clears the assignee. */
  @IsOptional()
  @IsUUID('4', { message: 'شناسه مسئول معتبر نیست.' })
  assigneeId?: string | null;

  /** `null` clears the due date. */
  @IsOptional()
  @IsCalendarDate()
  dueDate?: string | null;
}

export class TodoFiltersDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'شماره صفحه معتبر نیست.' })
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'اندازه صفحه معتبر نیست.' })
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(TodoStatus, { message: 'وضعیت معتبر نیست.' })
  status?: TodoStatus;

  @IsOptional()
  @IsUUID('4', { message: 'شناسه مسئول معتبر نیست.' })
  assigneeId?: string;
}
