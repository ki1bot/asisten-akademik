import type {
  Assignment,
  DashboardSummary,
  Exam,
  Schedule,
} from "@kampushub/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/screen";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { colors } from "@/constants/app-theme";
import { api } from "@/lib/api";
import {
  assignmentStatusLabels,
  formatDateTime,
  getGreeting,
} from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";

interface MobileDashboardSummary extends DashboardSummary {
  productivity: {
    totalAssignments: number;
    completedAssignments: number;
    completionPercentage: number;
  };
}

function ScheduleItem({ schedule }: { schedule: Schedule }) {
  return (
    <View style={styles.listItem}>
      <View
        style={[
          styles.courseIndicator,
          {
            backgroundColor: schedule.course?.color ?? colors.success,
          },
        ]}
      />

      <View style={styles.listContent}>
        <Text numberOfLines={1} style={styles.listTitle}>
          {schedule.course?.name ?? "Mata kuliah"}
        </Text>

        <Text style={styles.listDescription}>
          {schedule.startTime}–{schedule.endTime}
          {schedule.room ? ` · ${schedule.room}` : ""}
        </Text>
      </View>
    </View>
  );
}

function AssignmentItem({ assignment }: { assignment: Assignment }) {
  return (
    <View style={styles.listItem}>
      <View style={[styles.iconBox, styles.assignmentIcon]}>
        <Ionicons
          name="document-text-outline"
          size={19}
          color={colors.danger}
        />
      </View>

      <View style={styles.listContent}>
        <Text numberOfLines={1} style={styles.listTitle}>
          {assignment.title}
        </Text>

        <Text numberOfLines={1} style={styles.listDescription}>
          {assignment.course?.name ?? "Mata kuliah"}
        </Text>

        <Text style={styles.deadline}>
          {formatDateTime(assignment.deadline)}
        </Text>
      </View>
    </View>
  );
}

function ExamItem({ exam }: { exam: Exam }) {
  return (
    <View style={styles.listItem}>
      <View style={[styles.iconBox, styles.examIcon]}>
        <Ionicons name="school-outline" size={19} color={colors.warning} />
      </View>

      <View style={styles.listContent}>
        <Text numberOfLines={1} style={styles.listTitle}>
          {exam.title}
        </Text>

        <Text numberOfLines={1} style={styles.listDescription}>
          {exam.course?.name ?? "Mata kuliah"}
        </Text>

        <Text style={styles.examDate}>{formatDateTime(exam.examDate)}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user);

  const query = useQuery({
    queryKey: ["mobile-dashboard"],
    queryFn: async () => {
      const response = await api.get<MobileDashboardSummary>("/dashboard");

      return response.data;
    },
  });

  const data = query.data;
  const displayName = user?.profile?.name ?? "Mahasiswa";
  const firstName = displayName.split(" ")[0];

  return (
    <Screen
      refreshing={query.isRefetching}
      onRefresh={() => {
        void query.refetch();
      }}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text numberOfLines={1} style={styles.name}>
            {firstName}
          </Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.semesterRow}>
        <Text style={styles.semesterLabel}>
          {data?.activeSemester?.name ?? "Belum ada semester aktif"}
        </Text>

        {data?.activeSemester ? (
          <Badge label={data.activeSemester.academicYear} tone="success" />
        ) : null}
      </View>

      <View style={styles.metrics}>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, styles.scheduleMetric]}>
            <Ionicons name="time-outline" size={21} color={colors.success} />
          </View>

          <Text style={styles.metricValue}>
            {data?.todaySchedules.length ?? 0}
          </Text>

          <Text style={styles.metricLabel}>Kelas hari ini</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, styles.overdueMetric]}>
            <Ionicons
              name="alert-circle-outline"
              size={21}
              color={colors.danger}
            />
          </View>

          <Text style={styles.metricValue}>
            {data?.overdueAssignments.length ?? 0}
          </Text>

          <Text style={styles.metricLabel}>Terlambat</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, styles.attendanceMetric]}>
            <Ionicons
              name="checkmark-circle-outline"
              size={21}
              color={colors.warning}
            />
          </View>

          <Text style={styles.metricValue}>
            {data?.attendance.percentage ?? 0}%
          </Text>

          <Text style={styles.metricLabel}>Kehadiran</Text>
        </Card>

        <Card style={[styles.metricCard, styles.gpaCard]}>
          <View style={[styles.metricIcon, styles.gpaMetric]}>
            <Ionicons name="school-outline" size={21} color={colors.white} />
          </View>

          <Text style={[styles.metricValue, styles.gpaValue]}>
            {(data?.gpa.gpa ?? 0).toFixed(2)}
          </Text>

          <Text style={[styles.metricLabel, styles.gpaLabel]}>IP</Text>
        </Card>
      </View>

      <Card style={styles.progressCard}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Produktivitas tugas</Text>
            <Text style={styles.sectionSubtitle}>Progres semester aktif</Text>
          </View>

          <Text style={styles.progressPercentage}>
            {data?.productivity.completionPercentage ?? 0}%
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${data?.productivity.completionPercentage ?? 0}%`,
              },
            ]}
          />
        </View>

        <View style={styles.progressDetails}>
          <Text style={styles.progressDetailText}>
            {data?.productivity.completedAssignments ?? 0} selesai
          </Text>

          <Text style={styles.progressDetailText}>
            {data?.productivity.totalAssignments ?? 0} total
          </Text>
        </View>
      </Card>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Jadwal hari ini</Text>
            <Text style={styles.sectionSubtitle}>
              Perkuliahan yang perlu diikuti
            </Text>
          </View>
        </View>

        <Card>
          {data?.todaySchedules.length ? (
            data.todaySchedules.map((schedule) => (
              <ScheduleItem key={schedule.id} schedule={schedule} />
            ))
          ) : (
            <Text style={styles.emptyText}>
              Tidak ada jadwal kuliah hari ini.
            </Text>
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Deadline terdekat</Text>
            <Text style={styles.sectionSubtitle}>
              Tugas yang perlu diprioritaskan
            </Text>
          </View>
        </View>

        <Card>
          {data?.upcomingAssignments.length ? (
            data.upcomingAssignments
              .slice(0, 4)
              .map((assignment) => (
                <AssignmentItem key={assignment.id} assignment={assignment} />
              ))
          ) : (
            <Text style={styles.emptyText}>
              Tidak ada deadline dalam waktu dekat.
            </Text>
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Ujian mendatang</Text>
            <Text style={styles.sectionSubtitle}>
              Persiapkan materi lebih awal
            </Text>
          </View>
        </View>

        <Card>
          {data?.upcomingExams.length ? (
            data.upcomingExams
              .slice(0, 4)
              .map((exam) => <ExamItem key={exam.id} exam={exam} />)
          ) : (
            <Text style={styles.emptyText}>
              Belum ada ujian dalam waktu dekat.
            </Text>
          )}
        </Card>
      </View>

      {data?.overdueAssignments.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perlu segera ditangani</Text>

          <Card style={styles.overdueCard}>
            {data.overdueAssignments.slice(0, 3).map((assignment) => (
              <View key={assignment.id} style={styles.overdueItem}>
                <View style={styles.overdueDot} />

                <View style={styles.listContent}>
                  <Text style={styles.listTitle}>{assignment.title}</Text>
                  <Text style={styles.listDescription}>
                    {assignmentStatusLabels[assignment.status]}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  name: {
    marginTop: 3,
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#E5C996",
  },
  avatarText: {
    color: "#493819",
    fontSize: 18,
    fontWeight: "900",
  },
  semesterRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  semesterLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  metricCard: {
    width: "48.5%",
    minHeight: 142,
  },
  metricIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  scheduleMetric: {
    backgroundColor: colors.successMuted,
  },
  overdueMetric: {
    backgroundColor: colors.dangerMuted,
  },
  attendanceMetric: {
    backgroundColor: colors.warningMuted,
  },
  gpaMetric: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  metricValue: {
    marginTop: 16,
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
  },
  metricLabel: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  gpaCard: {
    backgroundColor: colors.primary,
  },
  gpaValue: {
    color: colors.white,
  },
  gpaLabel: {
    color: "#AFC7BE",
  },
  progressCard: {
    marginTop: 18,
  },
  section: {
    marginTop: 28,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
  },
  progressPercentage: {
    color: colors.success,
    fontSize: 24,
    fontWeight: "900",
  },
  progressTrack: {
    height: 10,
    overflow: "hidden",
    marginTop: 22,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  progressBar: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.success,
  },
  progressDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  progressDetailText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  listDescription: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
  },
  courseIndicator: {
    width: 4,
    height: 42,
    borderRadius: 999,
  },
  iconBox: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  assignmentIcon: {
    backgroundColor: colors.dangerMuted,
  },
  examIcon: {
    backgroundColor: colors.warningMuted,
  },
  deadline: {
    marginTop: 5,
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
  },
  examDate: {
    marginTop: 5,
    color: colors.warning,
    fontSize: 11,
    fontWeight: "700",
  },
  emptyText: {
    paddingVertical: 24,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  overdueCard: {
    marginTop: 12,
    borderColor: "#EDCBC7",
    backgroundColor: "#FFF8F7",
  },
  overdueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 10,
  },
  overdueDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.danger,
  },
});
