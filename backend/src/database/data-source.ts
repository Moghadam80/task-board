import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Todo } from '../todos/todo.entity.js';
import { TodoEvent } from '../todos/todo-event.entity.js';
import { User } from '../users/user.entity.js';
import { InitialTaskBoard1760000000000 } from './migrations/1760000000000-InitialTaskBoard.js';
import { AddSessionVersion1760000001000 } from './migrations/1760000001000-AddSessionVersion.js';
import { AddTodoEvents1760000002000 } from './migrations/1760000002000-AddTodoEvents.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ??
    'postgresql://taskboard:dev_password_change_me@localhost:5432/taskboard',
  entities: [User, Todo, TodoEvent],
  migrations: [InitialTaskBoard1760000000000, AddSessionVersion1760000001000, AddTodoEvents1760000002000],
  synchronize: false,
  migrationsRun: false,
  logging: process.env.DB_LOGGING === 'true',
});
