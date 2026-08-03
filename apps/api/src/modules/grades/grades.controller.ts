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
import { CreateGradeDto, GradeQueryDto, UpdateGradeDto } from './dto/grade.dto';
import { GradesService } from './grades.service';

@UseGuards(JwtAuthGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get('scale')
  getScale() {
    return this.gradesService.getScale();
  }

  @Get('gpa')
  getGpa(
    @CurrentUser() user: AuthUser,
    @Query('semesterId') semesterId?: string,
  ) {
    return this.gradesService.getGpa(user, semesterId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: GradeQueryDto) {
    return this.gradesService.findAll(user, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.gradesService.findOne(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGradeDto) {
    return this.gradesService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGradeDto,
  ) {
    return this.gradesService.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.gradesService.remove(user, id);
  }
}
