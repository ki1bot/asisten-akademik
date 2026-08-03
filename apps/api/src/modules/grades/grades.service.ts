import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../../common/types/auth-user.type';
import { assertOwnedResource } from '../../common/utils/ownership.util';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import {
  CreateGradeDto,
  GradeComponentDto,
  GradeQueryDto,
  UpdateGradeDto,
} from './dto/grade.dto';

interface GradeScaleItem {
  minimum: number;
  letter: string;
  weight: number;
}

type GradeWithRelations = Prisma.GradeGetPayload<{
  include: {
    course: {
      include: {
        semester: true;
      };
    };
    components: true;
  };
}>;

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findAll(user: AuthUser, query: GradeQueryDto) {
    if (query.semesterId) {
      await this.assertSemester(user.userId, query.semesterId);
    }

    const grades = await this.prisma.grade.findMany({
      where: {
        userId: user.userId,
        ...(query.semesterId
          ? {
              course: {
                semesterId: query.semesterId,
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
        components: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        course: {
          name: 'asc',
        },
      },
    });

    return grades.map((grade) => this.serializeGrade(grade));
  }

  async findOne(user: AuthUser, id: string) {
    const grade = await this.prisma.grade.findFirst({
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
        components: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    const ownedGrade = assertOwnedResource(grade, user.userId, 'Nilai');

    return this.serializeGrade(ownedGrade);
  }

  async create(user: AuthUser, dto: CreateGradeDto) {
    await this.assertCourse(user.userId, dto.courseId);

    const existing = await this.prisma.grade.findFirst({
      where: {
        userId: user.userId,
        courseId: dto.courseId,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Nilai untuk mata kuliah tersebut sudah tersedia',
      );
    }

    const finalScore = this.resolveFinalScore(dto.finalScore, dto.components);

    const scale = this.resolveScale(finalScore);

    const grade = await this.prisma.grade.create({
      data: {
        userId: user.userId,
        courseId: dto.courseId,
        finalScore,
        letter: scale.letter,
        weight: scale.weight,
        components: dto.components
          ? {
              create: dto.components.map((component) => ({
                name: component.name.trim(),
                score: component.score,
                weight: component.weight,
              })),
            }
          : undefined,
      },
      include: {
        course: {
          include: {
            semester: true,
          },
        },
        components: true,
      },
    });

    return this.serializeGrade(grade);
  }

  async update(user: AuthUser, id: string, dto: UpdateGradeDto) {
    const grade = await this.prisma.grade.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        components: true,
      },
    });

    const ownedGrade = assertOwnedResource(grade, user.userId, 'Nilai');

    let finalScore =
      ownedGrade.finalScore === null ? null : Number(ownedGrade.finalScore);

    if (dto.components) {
      finalScore = this.calculateComponentScore(dto.components);
    } else if (dto.finalScore !== undefined) {
      finalScore = dto.finalScore;
    }

    if (finalScore === null) {
      throw new BadRequestException(
        'Nilai akhir atau komponen nilai harus diberikan',
      );
    }

    const scale = this.resolveScale(finalScore);

    const updated = await this.prisma.grade.update({
      where: {
        id,
      },
      data: {
        finalScore,
        letter: scale.letter,
        weight: scale.weight,
        components: dto.components
          ? {
              deleteMany: {},
              create: dto.components.map((component) => ({
                name: component.name.trim(),
                score: component.score,
                weight: component.weight,
              })),
            }
          : undefined,
      },
      include: {
        course: {
          include: {
            semester: true,
          },
        },
        components: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return this.serializeGrade(updated);
  }

  async remove(user: AuthUser, id: string) {
    const grade = await this.prisma.grade.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    assertOwnedResource(grade, user.userId, 'Nilai');

    await this.prisma.grade.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Nilai berhasil dihapus',
    };
  }

  async getGpa(user: AuthUser, requestedSemesterId?: string) {
    const semester = requestedSemesterId
      ? await this.prisma.semester.findFirst({
          where: {
            id: requestedSemesterId,
            userId: user.userId,
          },
        })
      : await this.prisma.semester.findFirst({
          where: {
            userId: user.userId,
            isActive: true,
          },
          orderBy: {
            startDate: 'desc',
          },
        });

    if (requestedSemesterId) {
      assertOwnedResource(semester, user.userId, 'Semester');
    }

    if (!semester) {
      return {
        semesterId: null,
        semesterName: null,
        totalCredits: 0,
        totalQualityPoints: 0,
        gpa: 0,
        grades: [],
      };
    }

    const grades = await this.prisma.grade.findMany({
      where: {
        userId: user.userId,
        course: {
          semesterId: semester.id,
        },
        weight: {
          not: null,
        },
      },
      include: {
        course: {
          include: {
            semester: true,
          },
        },
        components: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        course: {
          name: 'asc',
        },
      },
    });

    const totalCredits = grades.reduce(
      (total, grade) => total + grade.course.credits,
      0,
    );

    const totalQualityPoints = grades.reduce(
      (total, grade) =>
        total + grade.course.credits * Number(grade.weight ?? 0),
      0,
    );

    const gpa =
      totalCredits === 0
        ? 0
        : Number((totalQualityPoints / totalCredits).toFixed(2));

    return {
      semesterId: semester.id,
      semesterName: semester.name,
      totalCredits,
      totalQualityPoints: Number(totalQualityPoints.toFixed(2)),
      gpa,
      grades: grades.map((grade) => this.serializeGrade(grade)),
    };
  }

  getScale(): GradeScaleItem[] {
    return this.getConfiguredScale();
  }

  private resolveFinalScore(
    finalScore?: number,
    components?: GradeComponentDto[],
  ): number {
    if (components?.length) {
      return this.calculateComponentScore(components);
    }

    if (finalScore === undefined) {
      throw new BadRequestException(
        'Nilai akhir atau komponen nilai harus diberikan',
      );
    }

    return finalScore;
  }

  private calculateComponentScore(components: GradeComponentDto[]): number {
    const totalWeight = components.reduce(
      (total, component) => total + component.weight,
      0,
    );

    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new BadRequestException(
        'Total bobot komponen nilai harus tepat 100',
      );
    }

    const score = components.reduce(
      (total, component) => total + component.score * (component.weight / 100),
      0,
    );

    return Number(score.toFixed(2));
  }

  private resolveScale(score: number): GradeScaleItem {
    const scale = this.getConfiguredScale();

    return (
      scale.find((item) => score >= item.minimum) ?? scale[scale.length - 1]
    );
  }

  private getConfiguredScale(): GradeScaleItem[] {
    const defaultScale: GradeScaleItem[] = [
      {
        minimum: 85,
        letter: 'A',
        weight: 4,
      },
      {
        minimum: 80,
        letter: 'A-',
        weight: 3.75,
      },
      {
        minimum: 75,
        letter: 'B+',
        weight: 3.5,
      },
      {
        minimum: 70,
        letter: 'B',
        weight: 3,
      },
      {
        minimum: 65,
        letter: 'B-',
        weight: 2.75,
      },
      {
        minimum: 60,
        letter: 'C+',
        weight: 2.5,
      },
      {
        minimum: 55,
        letter: 'C',
        weight: 2,
      },
      {
        minimum: 40,
        letter: 'D',
        weight: 1,
      },
      {
        minimum: 0,
        letter: 'E',
        weight: 0,
      },
    ];

    const configuredScale = this.config.get<string>('GRADE_SCALE');

    if (!configuredScale) {
      return defaultScale;
    }

    try {
      const parsed = JSON.parse(configuredScale) as GradeScaleItem[];

      const valid =
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every(
          (item) =>
            typeof item.minimum === 'number' &&
            typeof item.letter === 'string' &&
            typeof item.weight === 'number',
        );

      if (!valid) {
        return defaultScale;
      }

      return parsed.sort((first, second) => second.minimum - first.minimum);
    } catch {
      return defaultScale;
    }
  }

  private serializeGrade(grade: GradeWithRelations) {
    return {
      ...grade,
      finalScore: grade.finalScore === null ? null : Number(grade.finalScore),
      weight: grade.weight === null ? null : Number(grade.weight),
      components: grade.components.map((component) => ({
        ...component,
        score: Number(component.score),
        weight: Number(component.weight),
      })),
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
}
