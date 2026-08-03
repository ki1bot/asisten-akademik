import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/types/auth-user.type';
import { assertOwnedResource } from '../../common/utils/ownership.util';
import { PrismaService } from '../../database/prisma.service';
import {
  AssignmentStatus,
  NotificationType,
} from '../../generated/prisma/client';
import {
  AssignmentQueryDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from './dto/assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: AssignmentQueryDto) {
    await this.updateOverdueAssignments(user.userId);

    return this.prisma.assignment.findMany({
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
        ...(query.priority
          ? {
              priority: query.priority,
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
          deadline: 'asc',
        },
        {
          priority: 'desc',
        },
      ],
    });
  }

  async findOne(user: AuthUser, id: string) {
    await this.updateOverdueAssignments(user.userId);

    const assignment = await this.prisma.assignment.findFirst({
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

    return assertOwnedResource(assignment, user.userId, 'Tugas');
  }

  async create(user: AuthUser, dto: CreateAssignmentDto) {
    const course = await this.assertCourse(user.userId, dto.courseId);

    const status = this.resolveStatus(
      dto.status ?? AssignmentStatus.TODO,
      dto.deadline,
    );

    const submittedAt = this.resolveSubmittedAt(status, null);

    return this.prisma.$transaction(async (transaction) => {
      const assignment = await transaction.assignment.create({
        data: {
          userId: user.userId,
          courseId: dto.courseId,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          deadline: dto.deadline,
          priority: dto.priority,
          status,
          attachmentUrl: dto.attachmentUrl?.trim() || null,
          reminderAt: dto.reminderAt ?? null,
          submittedAt,
        },
        include: {
          course: true,
        },
      });

      if (dto.reminderAt) {
        await transaction.notification.create({
          data: {
            userId: user.userId,
            type: NotificationType.ASSIGNMENT,
            title: `Pengingat tugas: ${dto.title.trim()}`,
            message: `${course.name} memiliki deadline pada ${dto.deadline.toISOString()}`,
            scheduledFor: dto.reminderAt,
          },
        });
      }

      return assignment;
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateAssignmentDto) {
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    const ownedAssignment = assertOwnedResource(
      assignment,
      user.userId,
      'Tugas',
    );

    const courseId = dto.courseId ?? ownedAssignment.courseId;
    const deadline = dto.deadline ?? ownedAssignment.deadline;
    const requestedStatus = dto.status ?? ownedAssignment.status;
    const status = this.resolveStatus(requestedStatus, deadline);

    await this.assertCourse(user.userId, courseId);

    return this.prisma.assignment.update({
      where: {
        id,
      },
      data: {
        courseId,
        title: dto.title?.trim(),
        description:
          dto.description === undefined
            ? undefined
            : dto.description?.trim() || null,
        deadline,
        priority: dto.priority,
        status,
        attachmentUrl:
          dto.attachmentUrl === undefined
            ? undefined
            : dto.attachmentUrl?.trim() || null,
        reminderAt: dto.reminderAt,
        submittedAt: this.resolveSubmittedAt(
          status,
          ownedAssignment.submittedAt,
        ),
      },
      include: {
        course: true,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    assertOwnedResource(assignment, user.userId, 'Tugas');

    await this.prisma.assignment.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Tugas berhasil dihapus',
    };
  }

  async updateOverdueAssignments(userId: string): Promise<void> {
    await this.prisma.assignment.updateMany({
      where: {
        userId,
        deadline: {
          lt: new Date(),
        },
        status: {
          in: [AssignmentStatus.TODO, AssignmentStatus.IN_PROGRESS],
        },
      },
      data: {
        status: AssignmentStatus.OVERDUE,
      },
    });
  }

  private resolveStatus(
    status: AssignmentStatus,
    deadline: Date,
  ): AssignmentStatus {
    const isPending =
      status === AssignmentStatus.TODO ||
      status === AssignmentStatus.IN_PROGRESS;

    if (deadline < new Date() && isPending) {
      return AssignmentStatus.OVERDUE;
    }

    return status;
  }

  private resolveSubmittedAt(
    status: AssignmentStatus,
    currentValue: Date | null,
  ): Date | null {
    if (
      status === AssignmentStatus.SUBMITTED ||
      status === AssignmentStatus.COMPLETED
    ) {
      return currentValue ?? new Date();
    }

    return null;
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
