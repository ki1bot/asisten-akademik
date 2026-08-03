import { ConflictException, Injectable } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user.type';
import { assertOwnedResource } from '../../common/utils/ownership.util';
import { PrismaService } from '../../database/prisma.service';
import { AttendanceStatus } from '../../generated/prisma/client';
import {
  AttendanceQueryDto,
  CreateAttendanceDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendancesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: AttendanceQueryDto) {
    return this.prisma.attendance.findMany({
      where: {
        userId: user.userId,
        ...(query.courseId
          ? {
              courseId: query.courseId,
            }
          : {}),
        ...(query.status
          ? {
              status: query.status,
            }
          : {}),
        ...(query.from || query.to
          ? {
              meetingDate: {
                ...(query.from
                  ? {
                      gte: new Date(query.from),
                    }
                  : {}),
                ...(query.to
                  ? {
                      lte: new Date(query.to),
                    }
                  : {}),
              },
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
      orderBy: {
        meetingDate: 'desc',
      },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const attendance = await this.prisma.attendance.findFirst({
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

    return assertOwnedResource(attendance, user.userId, 'Presensi');
  }

  async create(user: AuthUser, dto: CreateAttendanceDto) {
    await this.assertCourse(user.userId, dto.courseId);
    await this.ensureUnique(user.userId, dto.courseId, dto.meetingDate);

    return this.prisma.attendance.create({
      data: {
        userId: user.userId,
        courseId: dto.courseId,
        meetingDate: dto.meetingDate,
        status: dto.status,
        notes: dto.notes?.trim() || null,
      },
      include: {
        course: true,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateAttendanceDto) {
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    const ownedAttendance = assertOwnedResource(
      attendance,
      user.userId,
      'Presensi',
    );

    const courseId = dto.courseId ?? ownedAttendance.courseId;
    const meetingDate = dto.meetingDate ?? ownedAttendance.meetingDate;

    await this.assertCourse(user.userId, courseId);
    await this.ensureUnique(user.userId, courseId, meetingDate, id);

    return this.prisma.attendance.update({
      where: {
        id,
      },
      data: {
        courseId,
        meetingDate,
        status: dto.status,
        notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
      },
      include: {
        course: true,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    assertOwnedResource(attendance, user.userId, 'Presensi');

    await this.prisma.attendance.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Presensi berhasil dihapus',
    };
  }

  async getSummary(user: AuthUser, query: AttendanceQueryDto) {
    const grouped = await this.prisma.attendance.groupBy({
      by: ['status'],
      where: {
        userId: user.userId,
        ...(query.courseId
          ? {
              courseId: query.courseId,
            }
          : {}),
        ...(query.from || query.to
          ? {
              meetingDate: {
                ...(query.from
                  ? {
                      gte: new Date(query.from),
                    }
                  : {}),
                ...(query.to
                  ? {
                      lte: new Date(query.to),
                    }
                  : {}),
              },
            }
          : {}),
      },
      _count: {
        _all: true,
      },
    });

    const counts = {
      present: 0,
      permitted: 0,
      sick: 0,
      absent: 0,
      cancelled: 0,
      replacement: 0,
    };

    for (const item of grouped) {
      const count = item._count._all;

      if (item.status === AttendanceStatus.PRESENT) {
        counts.present = count;
      }

      if (item.status === AttendanceStatus.PERMITTED) {
        counts.permitted = count;
      }

      if (item.status === AttendanceStatus.SICK) {
        counts.sick = count;
      }

      if (item.status === AttendanceStatus.ABSENT) {
        counts.absent = count;
      }

      if (item.status === AttendanceStatus.CANCELLED) {
        counts.cancelled = count;
      }

      if (item.status === AttendanceStatus.REPLACEMENT) {
        counts.replacement = count;
      }
    }

    const countedMeetings =
      counts.present +
      counts.permitted +
      counts.sick +
      counts.absent +
      counts.replacement;

    const attendedMeetings = counts.present + counts.replacement;

    return {
      total: countedMeetings + counts.cancelled,
      ...counts,
      percentage:
        countedMeetings === 0
          ? 0
          : Number(((attendedMeetings / countedMeetings) * 100).toFixed(2)),
    };
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

  private async ensureUnique(
    userId: string,
    courseId: string,
    meetingDate: Date,
    ignoredId?: string,
  ): Promise<void> {
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        userId,
        courseId,
        meetingDate,
        ...(ignoredId
          ? {
              id: {
                not: ignoredId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (attendance) {
      throw new ConflictException(
        'Presensi pada mata kuliah dan tanggal tersebut sudah tersedia',
      );
    }
  }
}
