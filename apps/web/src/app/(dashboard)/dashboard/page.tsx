"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  Assignment,
  DashboardSummary,
  Exam,
  Schedule,
} from "@kampushub/contracts";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import {
  assignmentStatusLabels,
  dayLabels,
  formatDateTime,
} from "@/lib/format";

interface DashboardData extends DashboardSummary {
  productivity: {
    totalAssignments: number;
    completedAssignments: number;
    completionPercentage: number;
  };
}

function ScheduleItem({ schedule }: { schedule: Schedule }) {
  return (
    <div className="flex gap-4 border-b border-[#edf0eb] py-4 last:border-0">
      <div
        className="w-1 shrink-0 rounded-full"
        style={{
          backgroundColor: schedule.course?.color ?? "#4f806f",
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-[#293830]">
          {schedule.course?.name}
        </p>
        <p className="mt-1 text-sm text-[#737e77]">
          {schedule.startTime}–{schedule.endTime}
          {schedule.room ? ` · ${schedule.room}` : ""}
        </p>
      </div>
    </div>
  );
}

function AssignmentItem({ assignment }: { assignment: Assignment }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#edf0eb] py-4 last:border-0">
      <div className="min-w-0">
        <p className="truncate font-bold text-[#293830]">{assignment.title}</p>
        <p className="mt-1 truncate text-sm text-[#737e77]">
          {assignment.course?.name}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-bold text-[#9d4d43]">
          {formatDateTime(assignment.deadline)}
        </p>
        <p className="mt-1 text-[11px] text-[#88918c]">
          {assignmentStatusLabels[assignment.status]}
        </p>
      </div>
    </div>
  );
}

function ExamItem({ exam }: { exam: Exam }) {
  return (
    <div className="flex gap-4 border-b border-[#edf0eb] py-4 last:border-0">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#efe6d4] text-[#765d2d]">
        <GraduationCap className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold text-[#293830]">{exam.title}</p>
        <p className="mt-1 text-sm text-[#737e77]">
          {exam.course?.name} · {formatDateTime(exam.examDate)}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await api.get<DashboardData>("/dashboard");
      return response.data;
    },
  });

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (!query.data) {
    return (
      <Card className="p-8">
        Dashboard gagal dimuat. Pastikan backend dan database sedang berjalan.
      </Card>
    );
  }

  const data = query.data;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={data.activeSemester?.name ?? "Belum ada semester aktif"}
        title="Ringkasan akademik"
        description="Prioritas hari ini, kondisi tugas, kehadiran, dan perkembangan nilai Anda."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#deebe5] text-[#286553]">
              <Clock3 className="size-5" />
            </span>
            <span className="text-xs font-bold text-[#849089]">Hari ini</span>
          </div>
          <p className="mt-5 text-3xl font-extrabold tracking-[-0.05em]">
            {data.todaySchedules.length}
          </p>
          <p className="mt-1 text-sm text-[#737e77]">Jadwal perkuliahan</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#f8e5df] text-[#a85247]">
              <AlertTriangle className="size-5" />
            </span>
            <span className="text-xs font-bold text-[#849089]">Perlu aksi</span>
          </div>
          <p className="mt-5 text-3xl font-extrabold tracking-[-0.05em]">
            {data.overdueAssignments.length}
          </p>
          <p className="mt-1 text-sm text-[#737e77]">Tugas terlambat</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#efe7d5] text-[#80642f]">
              <CheckCircle2 className="size-5" />
            </span>
            <span className="text-xs font-bold text-[#849089]">Semester</span>
          </div>
          <p className="mt-5 text-3xl font-extrabold tracking-[-0.05em]">
            {data.attendance.percentage}%
          </p>
          <p className="mt-1 text-sm text-[#737e77]">Tingkat kehadiran</p>
        </Card>

        <Card className="bg-[#173c34] p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-2xl bg-white/10 text-[#d8eee6]">
              <GraduationCap className="size-5" />
            </span>
            <span className="text-xs font-bold text-[#acc6bd]">
              {data.gpa.semesterName ?? "Semester aktif"}
            </span>
          </div>
          <p className="mt-5 text-3xl font-extrabold tracking-[-0.05em]">
            {data.gpa.gpa.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-[#acc6bd]">Indeks prestasi</p>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#26352e]">
                Jadwal hari ini
              </h2>
              <p className="mt-1 text-sm text-[#7a857f]">
                {dayLabels[new Date().getDay() || 7]}
              </p>
            </div>
            <Link
              href="/schedules"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#34705d]"
            >
              Semua jadwal
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="mt-3">
            {data.todaySchedules.length ? (
              data.todaySchedules.map((schedule) => (
                <ScheduleItem key={schedule.id} schedule={schedule} />
              ))
            ) : (
              <p className="py-12 text-center text-sm text-[#8a948f]">
                Tidak ada jadwal kuliah hari ini.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-[#26352e]">
                Produktivitas tugas
              </h2>
              <p className="mt-1 text-sm text-[#7a857f]">
                Penyelesaian pada semester aktif
              </p>
            </div>
            <span className="text-2xl font-extrabold text-[#2d6553]">
              {data.productivity.completionPercentage}%
            </span>
          </div>
          <div className="mt-8 h-3 overflow-hidden rounded-full bg-[#e9ede7]">
            <div
              className="h-full rounded-full bg-[#3f7b67] transition-all"
              style={{
                width: `${data.productivity.completionPercentage}%`,
              }}
            />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#f1f3ee] p-4">
              <p className="text-2xl font-extrabold">
                {data.productivity.completedAssignments}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#7c8781]">
                Sudah selesai
              </p>
            </div>
            <div className="rounded-2xl bg-[#f1f3ee] p-4">
              <p className="text-2xl font-extrabold">
                {data.productivity.totalAssignments}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#7c8781]">
                Total tugas
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold">Deadline terdekat</h2>
              <p className="mt-1 text-sm text-[#7a857f]">
                Maksimal 14 hari ke depan
              </p>
            </div>
            <CalendarClock className="size-5 text-[#4a7867]" />
          </div>
          <div className="mt-3">
            {data.upcomingAssignments.length ? (
              data.upcomingAssignments.map((assignment) => (
                <AssignmentItem key={assignment.id} assignment={assignment} />
              ))
            ) : (
              <p className="py-12 text-center text-sm text-[#8a948f]">
                Tidak ada deadline dalam waktu dekat.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold">Ujian mendatang</h2>
              <p className="mt-1 text-sm text-[#7a857f]">
                Persiapkan materi sebelum hari ujian
              </p>
            </div>
            <GraduationCap className="size-5 text-[#82652f]" />
          </div>
          <div className="mt-3">
            {data.upcomingExams.length ? (
              data.upcomingExams.map((exam) => (
                <ExamItem key={exam.id} exam={exam} />
              ))
            ) : (
              <p className="py-12 text-center text-sm text-[#8a948f]">
                Belum ada ujian dalam waktu dekat.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
