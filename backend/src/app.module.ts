import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './health.controller.js';
import { Todo } from './todos/todo.entity.js';
import { TodoEvent } from './todos/todo-event.entity.js';
import { TodosModule } from './todos/todos.module.js';
import { User } from './users/user.entity.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Todo, TodoEvent],
      synchronize: false,
      migrationsRun: false,
      autoLoadEntities: false,
      logging: process.env.DB_LOGGING === 'true',
    }),
    UsersModule,
    AuthModule,
    TodosModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
