import type {
  AttendanceSummary,
  Course,
  GpaSummary,
  Semester,
} from "@kampushub/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/screen";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { colors } from "@/constants/app-theme";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

export default function AcademicsScreen() {
  const semestersQuery = useQuery({
    queryKey: ["mobile-semesters"],
    queryFn: async () => {
      const response = await api.get<Semester[]>("/semesters");
      return response.data;
    },
  });

  const coursesQuery = useQuery({
    queryKey: ["mobile-courses"],
    queryFn: async () => {
      const response = await api.get<Course[]>("/courses");
      return response.data;
    },
  });

  const attendanceQuery = useQuery({
    queryKey: ["mobile-attendance-summary"],
    queryFn: async () => {
      const response = await api.get<AttendanceSummary>("/attendances/summary");

      return response.data;
    },
  });

  const gpaQuery = useQuery({
    queryKey: ["mobile-gpa"],
    queryFn: async () => {
      const response = await api.get<GpaSummary>("/grades/gpa");
      return response.data;
    },
  });

  const activeSemester = semestersQuery.data?.find(
    (semester) => semester.isActive,
  );

  const activeCourses = activeSemester
    ? (coursesQuery.data?.filter(
        (course) => course.semesterId === activeSemester.id,
      ) ?? [])
    : (coursesQuery.data ?? []);

  const refreshing =
    semestersQuery.isRefetching ||
    coursesQuery.isRefetching ||
    attendanceQuery.isRefetching ||
    gpaQuery.isRefetching;

  const refresh = () => {
    void Promise.all([
      semestersQuery.refetch(),
      coursesQuery.refetch(),
      attendanceQuery.refetch(),
      gpaQuery.refetch(),
    ]);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PERFORMA AKADEMIK</Text>
        <Text style={styles.title}>Semester dan nilai</Text>
        <Text style={styles.description}>
          Ringkasan SKS, IP, kehadiran, dan mata kuliah semester aktif.
        </Text>
      </View>

      <Card style={styles.gpaCard}>
        <View style={styles.gpaHeading}>
          <View>
            <Text style={styles.gpaLabel}>INDEKS PRESTASI</Text>
            <Text style={styles.gpaSemester}>
              {gpaQuery.data?.semesterName ?? "Belum ada semester aktif"}
            </Text>
          </View>

          <View style={styles.gpaIcon}>
            <Ionicons name="school-outline" size={22} color={colors.white} />
          </View>
        </View>

        <Text style={styles.gpaValue}>
          {(gpaQuery.data?.gpa ?? 0).toFixed(2)}
        </Text>

        <View style={styles.gpaDetails}>
          <View style={styles.gpaDetail}>
            <Text style={styles.gpaDetailValue}>
              {gpaQuery.data?.totalCredits ?? 0}
            </Text>
            <Text style={styles.gpaDetailLabel}>SKS dinilai</Text>
          </View>

          <View style={styles.gpaDetail}>
            <Text style={styles.gpaDetailValue}>
              {gpaQuery.data?.grades.length ?? 0}
            </Text>
            <Text style={styles.gpaDetailLabel}>Mata kuliah</Text>
          </View>
        </View>
      </Card>

      <View style={styles.metrics}>
        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, styles.presentIcon]}>
            <Ionicons
              name="checkmark-done-outline"
              size={21}
              color={colors.success}
            />
          </View>

          <Text style={styles.metricValue}>
            {attendanceQuery.data?.percentage ?? 0}%
          </Text>

          <Text style={styles.metricLabel}>Kehadiran</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, styles.absentIcon]}>
            <Ionicons
              name="close-circle-outline"
              size={21}
              color={colors.danger}
            />
          </View>

          <Text style={styles.metricValue}>
            {attendanceQuery.data?.absent ?? 0}
          </Text>

          <Text style={styles.metricLabel}>Alpa</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, styles.permissionIcon]}>
            <Ionicons
              name="document-text-outline"
              size={21}
              color={colors.warning}
            />
          </View>

          <Text style={styles.metricValue}>
            {(attendanceQuery.data?.permitted ?? 0) +
              (attendanceQuery.data?.sick ?? 0)}
          </Text>

          <Text style={styles.metricLabel}>Izin dan sakit</Text>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIcon, styles.courseIcon]}>
            <Ionicons name="book-outline" size={21} color={colors.info} />
          </View>

          <Text style={styles.metricValue}>{activeCourses.length}</Text>

          <Text style={styles.metricLabel}>Mata kuliah</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Semester aktif</Text>

        {activeSemester ? (
          <Card style={styles.semesterCard}>
            <View style={styles.semesterHeading}>
              <View style={styles.flex}>
                <Text style={styles.semesterName}>{activeSemester.name}</Text>

                <Text style={styles.academicYear}>
                  {activeSemester.academicYear}
                </Text>
              </View>

              <Badge label="Aktif" tone="success" />
            </View>

            <View style={styles.semesterPeriod}>
              <Ionicons
                name="calendar-outline"
                size={19}
                color={colors.textMuted}
              />

              <Text style={styles.periodText}>
                {formatDate(activeSemester.startDate)} hingga{" "}
                {formatDate(activeSemester.endDate)}
              </Text>
            </View>
          </Card>
        ) : (
          <EmptyState
            icon={
              <Ionicons
                name="calendar-outline"
                size={25}
                color={colors.success}
              />
            }
            title="Belum ada semester aktif"
            description="Buat atau aktifkan semester melalui website KampusHub."
          />
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Mata kuliah</Text>
            <Text style={styles.sectionDescription}>
              {activeCourses.length} mata kuliah pada semester aktif
            </Text>
          </View>
        </View>

        {activeCourses.length ? (
          <Card>
            {activeCourses.map((course) => (
              <View key={course.id} style={styles.courseItem}>
                <View
                  style={[
                    styles.courseColor,
                    {
                      backgroundColor: course.color,
                    },
                  ]}
                />

                <View style={styles.flex}>
                  <Text numberOfLines={1} style={styles.courseName}>
                    {course.name}
                  </Text>

                  <Text style={styles.courseDetails}>
                    {course.code} · {course.credits} SKS
                  </Text>

                  <Text numberOfLines={1} style={styles.lecturer}>
                    {course.lecturer || "Dosen belum ditentukan"}
                  </Text>
                </View>

                <Text style={styles.room}>{course.room || "—"}</Text>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={
              <Ionicons name="book-outline" size={25} color={colors.info} />
            }
            title="Belum ada mata kuliah"
            description="Tambahkan mata kuliah melalui website KampusHub."
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    marginTop: 3,
  },
  eyebrow: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  title: {
    marginTop: 7,
    color: colors.text,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -1,
  },
  description: {
    marginTop: 9,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  gpaCard: {
    marginTop: 24,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  gpaHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gpaLabel: {
    color: "#A8C5BA",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  gpaSemester: {
    marginTop: 5,
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  gpaIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  gpaValue: {
    marginTop: 24,
    color: colors.white,
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -3,
  },
  gpaDetails: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  gpaDetail: {
    flex: 1,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  gpaDetailValue: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "900",
  },
  gpaDetailLabel: {
    marginTop: 3,
    color: "#A8C5BA",
    fontSize: 10,
    fontWeight: "700",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  metricCard: {
    width: "48.5%",
    minHeight: 132,
  },
  metricIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  presentIcon: {
    backgroundColor: colors.successMuted,
  },
  absentIcon: {
    backgroundColor: colors.dangerMuted,
  },
  permissionIcon: {
    backgroundColor: colors.warningMuted,
  },
  courseIcon: {
    backgroundColor: colors.infoMuted,
  },
  metricValue: {
    marginTop: 14,
    color: colors.text,
    fontSize: 27,
    fontWeight: "900",
  },
  metricLabel: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  section: {
    marginTop: 28,
  },
  sectionHeading: {
    marginBottom: 13,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionDescription: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
  },
  semesterCard: {
    marginTop: 13,
  },
  semesterHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  semesterName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  academicYear: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  semesterPeriod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    padding: 13,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  periodText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  courseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  courseColor: {
    width: 5,
    height: 48,
    borderRadius: 999,
  },
  courseName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  courseDetails: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  lecturer: {
    marginTop: 4,
    color: colors.textSoft,
    fontSize: 11,
  },
  room: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
});
