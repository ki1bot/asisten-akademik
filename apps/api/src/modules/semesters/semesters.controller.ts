import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateSemesterDto, UpdateSemesterDto } from './dto/semester.dto';
import { SemestersService } from './semesters.service';

@UseGuards(JwtAuthGuard)
@Controller('semesters')
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.semestersService.findAll(user);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.semestersService.findOne(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSemesterDto) {
    return this.semestersService.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSemesterDto,
  ) {
    return this.semestersService.update(user, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.semestersService.remove(user, id);
  }
}
