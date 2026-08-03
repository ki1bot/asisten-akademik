import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../../common/types/auth-user.type';
import { PrismaService } from '../../database/prisma.service';
import { AssignmentStatus } from '../../generated/prisma/client';
import { AssignmentsService } from '../assignments/assignments.service';
import { AttendancesService } from '../attendances/attendances.service';
import { GradesService } from '../grades/grades.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly assignmentsService: AssignmentsService,
    private readonly attendancesService: AttendancesService,
    private readonly gradesService: GradesService,
  ) {}

  async getSummary(user: AuthUser) {
    await this.assignmentsService.updateOverdueAssignments(user.userId);

    const profile = await this.prisma.profile.findUnique({
      where: {
        userId: user.userId,
      },
      select: {
        timezone: true,
      },
    });

    const timezone = profile?.timezone ?? 'Asia/Jakarta';
    const dayOfWeek = this.getDayOfWeek(timezone);
    const now = new Date();
    const upcomingDays = this.getUpcomingDays();
    const upcomingLimit = new Date(
      now.getTime() + upcomingDays * 24 * 60 * 60 * 1000,
    );

    const activeSemester = await this.prisma.semester.findFirst({
      where: {
        userId: user.userId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    const [
      todaySchedules,
      upcomingAssignments,
      overdueAssignments,
      upcomingExams,
      notifications,
      attendance,
      gpa,
    ] = await Promise.all([
      this.prisma.schedule.findMany({
        where: {
          userId: user.userId,
          dayOfWeek,
          ...(activeSemester
            ? {
                course: {
                  semesterId: activeSemester.id,
                },
              }
            : {}),
        },
        include: {
          course: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      }),
      this.prisma.assignment.findMany({
        where: {
          userId: user.userId,
          deadline: {
            gte: now,
            lte: upcomingLimit,
          },
          status: {
            in: [AssignmentStatus.TODO, AssignmentStatus.IN_PROGRESS],
          },
          ...(activeSemester
            ? {
                course: {
                  semesterId: activeSemester.id,
                },
              }
            : {}),
        },
        include: {
          course: true,
        },
        orderBy: {
          deadline: 'asc',
        },
        take: 8,
      }),
      this.prisma.assignment.findMany({
        where: {
          userId: user.userId,
          status: AssignmentStatus.OVERDUE,
          ...(activeSemester
            ? {
                course: {
                  semesterId: activeSemester.id,
                },
              }
            : {}),
        },
        include: {
          course: true,
        },
        orderBy: {
          deadline: 'asc',
        },
        take: 8,
      }),
      this.prisma.exam.findMany({
        where: {
          userId: user.userId,
          examDate: {
            gte: now,
            lte: upcomingLimit,
          },
          ...(activeSemester
            ? {
                course: {
                  semesterId: activeSemester.id,
                },
              }
            : {}),
        },
        include: {
          course: true,
        },
        orderBy: [
          {
            examDate: 'asc',
          },
          {
            startTime: 'asc',
          },
        ],
        take: 8,
      }),
      this.prisma.notification.findMany({
        where: {
          userId: user.userId,
          readAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 8,
      }),
      this.attendancesService.getSummary(user, {
        ...(activeSemester
          ? {
              from: activeSemester.startDate.toISOString(),
              to: activeSemester.endDate.toISOString(),
            }
          : {}),
      }),
      this.gradesService.getGpa(user, activeSemester?.id),
    ]);

    const completedAssignments = await this.prisma.assignment.count({
      where: {
        userId: user.userId,
        status: {
          in: [AssignmentStatus.SUBMITTED, AssignmentStatus.COMPLETED],
        },
        ...(activeSemester
          ? {
              course: {
                semesterId: activeSemester.id,
              },
            }
          : {}),
      },
    });

    const totalAssignments = await this.prisma.assignment.count({
      where: {
        userId: user.userId,
        ...(activeSemester
          ? {
              course: {
                semesterId: activeSemester.id,
              },
            }
          : {}),
      },
    });

    return {
      activeSemester,
      todaySchedules,
      upcomingAssignments,
      overdueAssignments,
      upcomingExams,
      attendance,
      gpa,
      notifications,
      productivity: {
        totalAssignments,
        completedAssignments,
        completionPercentage:
          totalAssignments === 0
            ? 0
            : Number(
                ((completedAssignments / totalAssignments) * 100).toFixed(2),
              ),
      },
    };
  }

  private getUpcomingDays(): number {
    const value = Number(
      this.config.get<string>('DASHBOARD_UPCOMING_DAYS') ?? '14',
    );

    if (!Number.isFinite(value) || value < 1) {
      return 14;
    }

    return Math.min(Math.floor(value), 90);
  }

  private getDayOfWeek(timezone: string): number {
    const dayMap: Record<string, number> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    };

    try {
      const day = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: timezone,
      }).format(new Date());

      return dayMap[day] ?? 1;
    } catch {
      const day = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(new Date());

      return dayMap[day] ?? 1;
    }
  }
}
