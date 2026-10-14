import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CreateUserDto, UpdateUserDto } from './dto.js';
import { UserRole } from './user.entity.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Assignee picker. Members cannot assign, so they do not get the list. */
  @Get('directory')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  directory() {
    return this.users.listDirectory();
  }

  @Get()
  @Roles(UserRole.OWNER)
  list() {
    return this.users.list();
  }

  @Post()
  @Roles(UserRole.OWNER)
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.update(id, dto);
  }
}
