import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { User } from '../users/user.entity.js';
import { CreateTodoDto, TodoFiltersDto, UpdateTodoDto } from './dto.js';
import { TodosService } from './todos.service.js';

@Controller('todos')
@UseGuards(JwtAuthGuard)
export class TodosController {
  constructor(private readonly todos: TodosService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() filters: TodoFiltersDto) {
    return this.todos.list(user, filters);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateTodoDto) {
    return this.todos.create(dto, user);
  }

  @Get(':id')
  get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.todos.get(id, user);
  }

  @Get(':id/activity')
  activity(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.todos.activity(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTodoDto,
  ) {
    return this.todos.update(id, dto, user);
  }

  @Delete(':id')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: User,
  ) {
    return this.todos.remove(id, user);
  }
}
