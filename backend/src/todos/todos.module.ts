import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { Todo } from './todo.entity.js';
import { TodoEvent } from './todo-event.entity.js';
import { TodosController } from './todos.controller.js';
import { TodosService } from './todos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Todo, TodoEvent]), UsersModule],
  controllers: [TodosController],
  providers: [TodosService],
})
export class TodosModule {}
