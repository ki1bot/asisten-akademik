import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './database/prisma.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExamsModule } from './modules/exams/exams.module';
import { GradesModule } from './modules/grades/grades.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { SemestersModule } from './modules/semesters/semesters.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    SemestersModule,
    CoursesModule,
    SchedulesModule,
    AssignmentsModule,
    ExamsModule,
    AttendancesModule,
    GradesModule,
    NotificationsModule,
    DashboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
