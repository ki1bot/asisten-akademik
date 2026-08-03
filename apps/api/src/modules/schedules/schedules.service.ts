import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user.type';
import { assertOwnedResource } from '../../common/utils/ownership.util';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateScheduleDto,
  ScheduleQueryDto,
  UpdateScheduleDto,
} from './dto/schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: ScheduleQueryDto) {
    return this.prisma.schedule.findMany({
      where: {
        userId: user.userId,
        ...(query.courseId
          ? {
              courseId: query.courseId,
            }
          : {}),
        ...(query.dayOfWeek
          ? {
              dayOfWeek: query.dayOfWeek,
            }
          : {}),
      },
      include: {
        course: {
          include: {
            semester: true,
          },
        },
      },
      orderBy: [
        {
          dayOfWeek: 'asc',
        },
        {
          startTime: 'asc',
        },
      ],
    });
  }

  async findOne(user: AuthUser, id: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        course: {
          include: {
            semester: true,
          },
        },
      },
    });

    return assertOwnedResource(schedule, user.userId, 'Jadwal');
  }

  async create(user: AuthUser, dto: CreateScheduleDto) {
    await this.assertCourse(user.userId, dto.courseId);
    this.validateTimes(dto.startTime, dto.endTime);

    return this.prisma.schedule.create({
      data: {
        userId: user.userId,
        courseId: dto.courseId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        room: dto.room?.trim() || null,
        lectureType: dto.lectureType,
        onlineUrl: dto.onlineUrl?.trim() || null,
        reminderMinutes: dto.reminderMinutes ?? null,
      },
      include: {
        course: true,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateScheduleDto) {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    const ownedSchedule = assertOwnedResource(schedule, user.userId, 'Jadwal');

    const courseId = dto.courseId ?? ownedSchedule.courseId;
    const startTime = dto.startTime ?? ownedSchedule.startTime;
    const endTime = dto.endTime ?? ownedSchedule.endTime;

    await this.assertCourse(user.userId, courseId);
    this.validateTimes(startTime, endTime);

    return this.prisma.schedule.update({
      where: {
        id,
      },
      data: {
        courseId,
        dayOfWeek: dto.dayOfWeek,
        startTime,
        endTime,
        room: dto.room === undefined ? undefined : dto.room?.trim() || null,
        lectureType: dto.lectureType,
        onlineUrl:
          dto.onlineUrl === undefined
            ? undefined
            : dto.onlineUrl?.trim() || null,
        reminderMinutes: dto.reminderMinutes,
      },
      include: {
        course: true,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    assertOwnedResource(schedule, user.userId, 'Jadwal');

    await this.prisma.schedule.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Jadwal berhasil dihapus',
    };
  }

  private validateTimes(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException('Jam selesai harus setelah jam mulai');
    }
  }

  private async assertCourse(userId: string, courseId: string): Promise<void> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        userId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    assertOwnedResource(course, userId, 'Mata kuliah');
  }
}
