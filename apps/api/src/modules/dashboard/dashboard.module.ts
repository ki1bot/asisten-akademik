import { Module } from '@nestjs/common';
import { AssignmentsModule } from '../assignments/assignments.module';
import { AttendancesModule } from '../attendances/attendances.module';
import { GradesModule } from '../grades/grades.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AssignmentsModule, AttendancesModule, GradesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
