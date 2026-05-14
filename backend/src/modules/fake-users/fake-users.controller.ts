import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FakeUsersService, CreateFakeUserDto, UpdateFakeUserDto } from './fake-users.service';

@Controller('admin/fake-users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FakeUsersController {
  constructor(private readonly fakeUsersService: FakeUsersService) {}

  @Get()
  findAll() {
    return this.fakeUsersService.findAll();
  }

  @Get('count')
  count() {
    return this.fakeUsersService.count();
  }

  @Get('active')
  getActive() {
    return this.fakeUsersService.getActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fakeUsersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFakeUserDto) {
    return this.fakeUsersService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFakeUserDto) {
    return this.fakeUsersService.update(id, dto);
  }

  @Put(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.fakeUsersService.deactivate(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.fakeUsersService.delete(id);
  }

  @Post('events/:eventId/enroll')
  enrollFakeUser(@Param('eventId') eventId: string) {
    return this.fakeUsersService.enrollFakeUserToEvent(eventId);
  }
}
