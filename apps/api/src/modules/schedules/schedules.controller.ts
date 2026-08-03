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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/types/auth-user.type';
import {
  CreateScheduleDto,
  ScheduleQueryDto,
  UpdateScheduleDto,
} from './dto/schedule.dto';
import { SchedulesService } from './schedules.service';

@UseGuards(JwtAuthGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ScheduleQueryDto) {
    return this.schedulesService.findAll(user, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.schedulesService.findOne(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.schedulesService.remove(user, id);
  }
}
