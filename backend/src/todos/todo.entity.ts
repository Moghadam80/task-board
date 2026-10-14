import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { User } from '../users/user.entity.js';

// NOTE: User <-> Todo import each other. `Relation<>` keeps the emitted
// decorator metadata from touching `User` before it is initialised (ESM TDZ).
export enum TodoStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum TodoPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity({ name: 'todos' })
export class Todo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({
    type: 'enum',
    enum: TodoStatus,
    enumName: 'todos_status_enum',
    default: TodoStatus.TODO,
  })
  status!: TodoStatus;

  @Column({
    type: 'enum',
    enum: TodoPriority,
    enumName: 'todos_priority_enum',
    default: TodoPriority.MEDIUM,
  })
  priority!: TodoPriority;

  @Column({
    type: 'jsonb',
    default: () =>
      `'{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb`,
  })
  description!: Record<string, unknown>;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string | null;

  @ManyToOne(() => User, (user) => user.createdTodos, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'creator_id' })
  creator!: Relation<User>;

  @Column({ name: 'creator_id', type: 'uuid' })
  creatorId!: string;

  @ManyToOne(() => User, (user) => user.assignedTodos, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assignee_id' })
  assignee!: Relation<User> | null;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
