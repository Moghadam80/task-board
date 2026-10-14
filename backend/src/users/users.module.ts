import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { User } from './user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User]), JwtModule.register({})],
  controllers: [UsersController],
  providers: [UsersService, JwtAuthGuard, RolesGuard],
  // JwtModule is re-exported because JwtAuthGuard (used via @UseGuards in other
  // modules, e.g. TodosModule) needs JwtService in the *consuming* module.
  exports: [UsersService, TypeOrmModule, JwtModule, JwtAuthGuard, RolesGuard],
})
export class UsersModule {}
