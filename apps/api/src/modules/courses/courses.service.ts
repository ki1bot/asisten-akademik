import { ConflictException, Injectable } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user.type';
import { assertOwnedResource } from '../../common/utils/ownership.util';
import { PrismaService } from '../../database/prisma.service';
import {
  CourseQueryDto,
  CreateCourseDto,
  UpdateCourseDto,
} from './dto/course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: CourseQueryDto) {
    return this.prisma.course.findMany({
      where: {
        userId: user.userId,
        ...(query.semesterId
          ? {
              semesterId: query.semesterId,
            }
          : {}),
      },
      include: {
        semester: true,
        _count: {
          select: {
            schedules: true,
            assignments: true,
            exams: true,
            attendances: true,
          },
        },
      },
      orderBy: [
        {
          semester: {
            startDate: 'desc',
          },
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  async findOne(user: AuthUser, id: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        semester: true,
        schedules: {
          orderBy: [
            {
              dayOfWeek: 'asc',
            },
            {
              startTime: 'asc',
            },
          ],
        },
        assignments: {
          orderBy: {
            deadline: 'asc',
          },
        },
        exams: {
          orderBy: {
            examDate: 'asc',
          },
        },
        _count: {
          select: {
            attendances: true,
            grades: true,
          },
        },
      },
    });

    return assertOwnedResource(course, user.userId, 'Mata kuliah');
  }

  async create(user: AuthUser, dto: CreateCourseDto) {
    await this.assertSemester(user.userId, dto.semesterId);

    const code = dto.code.trim().toUpperCase();

    await this.ensureUniqueCode(user.userId, dto.semesterId, code);

    return this.prisma.course.create({
      data: {
        userId: user.userId,
        semesterId: dto.semesterId,
        code,
        name: dto.name.trim(),
        credits: dto.credits,
        lecturer: dto.lecturer?.trim() || null,
        room: dto.room?.trim() || null,
        color: dto.color.toUpperCase(),
        notes: dto.notes?.trim() || null,
      },
      include: {
        semester: true,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    const ownedCourse = assertOwnedResource(course, user.userId, 'Mata kuliah');

    const semesterId = dto.semesterId ?? ownedCourse.semesterId;
    const code = dto.code?.trim().toUpperCase() ?? ownedCourse.code;

    await this.assertSemester(user.userId, semesterId);
    await this.ensureUniqueCode(user.userId, semesterId, code, id);

    return this.prisma.course.update({
      where: {
        id,
      },
      data: {
        semesterId,
        code,
        name: dto.name?.trim(),
        credits: dto.credits,
        lecturer:
          dto.lecturer === undefined ? undefined : dto.lecturer?.trim() || null,
        room: dto.room === undefined ? undefined : dto.room?.trim() || null,
        color: dto.color?.toUpperCase(),
        notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
      },
      include: {
        semester: true,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    assertOwnedResource(course, user.userId, 'Mata kuliah');

    await this.prisma.course.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Mata kuliah berhasil dihapus',
    };
  }

  private async assertSemester(
    userId: string,
    semesterId: string,
  ): Promise<void> {
    const semester = await this.prisma.semester.findFirst({
      where: {
        id: semesterId,
        userId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    assertOwnedResource(semester, userId, 'Semester');
  }

  private async ensureUniqueCode(
    userId: string,
    semesterId: string,
    code: string,
    ignoredId?: string,
  ): Promise<void> {
    const course = await this.prisma.course.findFirst({
      where: {
        userId,
        semesterId,
        code,
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

    if (course) {
      throw new ConflictException(
        'Kode mata kuliah sudah digunakan pada semester tersebut',
      );
    }
  }
}
