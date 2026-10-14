import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from 'typeorm';
import { User } from '../users/user.entity.js';

export type TodoEventAction = 'created' | 'updated' | 'deleted';

@Entity({ name: 'todo_events' })
@Index('IDX_todo_events_todo_created', ['todoId', 'createdAt'])
export class TodoEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Intentionally not a foreign key: deletion events must survive task deletion.
  @Column({ name: 'todo_id', type: 'uuid' })
  todoId!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor!: Relation<User> | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  action!: TodoEventAction;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  changes!: Record<string, { from: unknown; to: unknown }>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
