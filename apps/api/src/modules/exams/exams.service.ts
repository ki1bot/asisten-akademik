import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user.type';
import { assertOwnedResource } from '../../common/utils/ownership.util';
import { PrismaService } from '../../database/prisma.service';
import { NotificationType } from '../../generated/prisma/client';
import { CreateExamDto, ExamQueryDto, UpdateExamDto } from './dto/exam.dto';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: ExamQueryDto) {
    return this.prisma.exam.findMany({
      where: {
        userId: user.userId,
        ...(query.courseId
          ? {
              courseId: query.courseId,
            }
          : {}),
        ...(query.type
          ? {
              type: query.type,
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
          examDate: 'asc',
        },
        {
          startTime: 'asc',
        },
      ],
    });
  }

  async findOne(user: AuthUser, id: string) {
    const exam = await this.prisma.exam.findFirst({
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

    return assertOwnedResource(exam, user.userId, 'Ujian');
  }

  async create(user: AuthUser, dto: CreateExamDto) {
    const course = await this.assertCourse(user.userId, dto.courseId);

    this.validateTimes(dto.startTime, dto.endTime);

    return this.prisma.$transaction(async (transaction) => {
      const exam = await transaction.exam.create({
        data: {
          userId: user.userId,
          courseId: dto.courseId,
          type: dto.type,
          title: dto.title.trim(),
          examDate: dto.examDate,
          startTime: dto.startTime || null,
          endTime: dto.endTime || null,
          room: dto.room?.trim() || null,
          topics: dto.topics?.trim() || null,
          reminderAt: dto.reminderAt ?? null,
        },
        include: {
          course: true,
        },
      });

      if (dto.reminderAt) {
        await transaction.notification.create({
          data: {
            userId: user.userId,
            type: NotificationType.EXAM,
            title: `Pengingat ujian: ${dto.title.trim()}`,
            message: `${course.name} memiliki ujian pada ${dto.examDate.toISOString()}`,
            scheduledFor: dto.reminderAt,
          },
        });
      }

      return exam;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateExamDto) {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    const ownedExam = assertOwnedResource(exam, user.userId, 'Ujian');

    const courseId = dto.courseId ?? ownedExam.courseId;
    const startTime =
      dto.startTime === undefined ? ownedExam.startTime : dto.startTime;
    const endTime = dto.endTime === undefined ? ownedExam.endTime : dto.endTime;

    await this.assertCourse(user.userId, courseId);
    this.validateTimes(startTime, endTime);

    return this.prisma.exam.update({
      where: {
        id,
      },
      data: {
        courseId,
        type: dto.type,
        title: dto.title?.trim(),
        examDate: dto.examDate,
        startTime:
          dto.startTime === undefined ? undefined : dto.startTime || null,
        endTime: dto.endTime === undefined ? undefined : dto.endTime || null,
        room: dto.room === undefined ? undefined : dto.room?.trim() || null,
        topics:
          dto.topics === undefined ? undefined : dto.topics?.trim() || null,
        reminderAt: dto.reminderAt,
      },
      include: {
        course: true,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    assertOwnedResource(exam, user.userId, 'Ujian');

    await this.prisma.exam.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Ujian berhasil dihapus',
    };
  }

  private validateTimes(
    startTime?: string | null,
    endTime?: string | null,
  ): void {
    if (startTime && endTime && startTime >= endTime) {
      throw new BadRequestException(
        'Jam selesai ujian harus setelah jam mulai',
      );
    }
  }

  private async assertCourse(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        userId,
      },
      select: {
        id: true,
        userId: true,
        name: true,
      },
    });

    return assertOwnedResource(course, userId, 'Mata kuliah');
  }
}
