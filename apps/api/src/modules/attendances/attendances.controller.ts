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
import { AuthUser } from '../../common/types/auth-user.type';
import { AttendancesService } from './attendances.service';
import {
  AttendanceQueryDto,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

@UseGuards(JwtAuthGuard)
@Controller('attendances')
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: AttendanceQueryDto,
  ) {
    return this.attendancesService.getSummary(user, query);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: AttendanceQueryDto) {
    return this.attendancesService.findAll(user, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attendancesService.findOne(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAttendanceDto) {
    return this.attendancesService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendancesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attendancesService.remove(user, id);
  }
}
