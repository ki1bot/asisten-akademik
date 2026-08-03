import type { Exam, Schedule } from "@kampushub/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMemo, useState } from "react";
import { Screen } from "@/components/screen";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { colors } from "@/constants/app-theme";
import { api } from "@/lib/api";
import {
  dayLabels,
  examTypeLabels,
  formatDate,
  getCurrentDayNumber,
  shortDayLabels,
} from "@/lib/format";

export default function AgendaScreen() {
  const [selectedDay, setSelectedDay] = useState(getCurrentDayNumber());

  const schedulesQuery = useQuery({
    queryKey: ["mobile-schedules"],
    queryFn: async () => {
      const response = await api.get<Schedule[]>("/schedules");
      return response.data;
    },
  });

  const examsQuery = useQuery({
    queryKey: ["mobile-exams"],
    queryFn: async () => {
      const response = await api.get<Exam[]>("/exams");
      return response.data;
    },
  });

  const selectedSchedules = useMemo(
    () =>
      schedulesQuery.data?.filter(
        (schedule) => schedule.dayOfWeek === selectedDay,
      ) ?? [],
    [schedulesQuery.data, selectedDay],
  );

  const upcomingExams = useMemo(
    () =>
      examsQuery.data
        ?.filter((exam) => new Date(exam.examDate) >= new Date())
        .slice(0, 6) ?? [],
    [examsQuery.data],
  );

  const refreshing = schedulesQuery.isRefetching || examsQuery.isRefetching;

  const refresh = () => {
    void Promise.all([schedulesQuery.refetch(), examsQuery.refetch()]);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>AGENDA MINGGUAN</Text>
        <Text style={styles.title}>Jadwal dan ujian</Text>
        <Text style={styles.description}>
          Lihat perkuliahan berdasarkan hari dan ujian yang akan datang.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayList}
      >
        {Object.entries(shortDayLabels).map(([value, label]) => {
          const day = Number(value);
          const active = day === selectedDay;

          return (
            <Pressable
              key={value}
              style={[styles.dayButton, active && styles.dayButtonActive]}
              onPress={() => setSelectedDay(day)}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  active && styles.dayButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{dayLabels[selectedDay]}</Text>

            <Text style={styles.sectionDescription}>
              {selectedSchedules.length} perkuliahan
            </Text>
          </View>

          <View style={styles.calendarIcon}>
            <Ionicons
              name="calendar-outline"
              size={21}
              color={colors.success}
            />
          </View>
        </View>

        {selectedSchedules.length ? (
          <View style={styles.scheduleList}>
            {selectedSchedules.map((schedule) => (
              <Card key={schedule.id} style={styles.scheduleCard}>
                <View
                  style={[
                    styles.courseColor,
                    {
                      backgroundColor: schedule.course?.color ?? colors.success,
                    },
                  ]}
                />

                <View style={styles.scheduleContent}>
                  <View style={styles.scheduleHeading}>
                    <View style={styles.flex}>
                      <Text numberOfLines={1} style={styles.courseName}>
                        {schedule.course?.name ?? "Mata kuliah"}
                      </Text>

                      <Text style={styles.courseCode}>
                        {schedule.course?.code}
                      </Text>
                    </View>

                    <Badge
                      label={
                        schedule.lectureType === "OFFLINE"
                          ? "Tatap muka"
                          : schedule.lectureType === "ONLINE"
                            ? "Daring"
                            : "Hybrid"
                      }
                      tone="info"
                    />
                  </View>

                  <View style={styles.scheduleMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="time-outline"
                        size={17}
                        color={colors.textMuted}
                      />
                      <Text style={styles.metaText}>
                        {schedule.startTime}–{schedule.endTime}
                      </Text>
                    </View>

                    {schedule.room ? (
                      <View style={styles.metaItem}>
                        <Ionicons
                          name="location-outline"
                          size={17}
                          color={colors.textMuted}
                        />
                        <Text style={styles.metaText}>{schedule.room}</Text>
                      </View>
                    ) : null}
                  </View>

                  {schedule.onlineUrl ? (
                    <Pressable
                      style={styles.onlineButton}
                      onPress={() => {
                        void Linking.openURL(schedule.onlineUrl as string);
                      }}
                    >
                      <Ionicons
                        name="videocam-outline"
                        size={17}
                        color={colors.success}
                      />

                      <Text style={styles.onlineButtonText}>
                        Buka kelas daring
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        ) : (
          <EmptyState
            icon={
              <Ionicons
                name="calendar-clear-outline"
                size={25}
                color={colors.success}
              />
            }
            title="Tidak ada jadwal"
            description={`Belum ada perkuliahan yang tercatat pada hari ${dayLabels[selectedDay]}.`}
          />
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Ujian mendatang</Text>
            <Text style={styles.sectionDescription}>
              Persiapkan materi sebelum pelaksanaan
            </Text>
          </View>
        </View>

        {upcomingExams.length ? (
          <Card>
            {upcomingExams.map((exam) => (
              <View key={exam.id} style={styles.examItem}>
                <View style={styles.examDateBox}>
                  <Text style={styles.examDay}>
                    {new Date(exam.examDate).getDate()}
                  </Text>

                  <Text style={styles.examMonth}>
                    {new Intl.DateTimeFormat("id-ID", {
                      month: "short",
                    })
                      .format(new Date(exam.examDate))
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.flex}>
                  <View style={styles.examHeading}>
                    <Text numberOfLines={1} style={styles.examTitle}>
                      {exam.title}
                    </Text>

                    <Badge label={examTypeLabels[exam.type]} tone="warning" />
                  </View>

                  <Text numberOfLines={1} style={styles.examCourse}>
                    {exam.course?.name ?? "Mata kuliah"}
                  </Text>

                  <Text style={styles.examMeta}>
                    {formatDate(exam.examDate)}
                    {exam.startTime ? ` · ${exam.startTime}` : ""}
                    {exam.room ? ` · ${exam.room}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon={
              <Ionicons
                name="school-outline"
                size={25}
                color={colors.warning}
              />
            }
            title="Belum ada ujian"
            description="Tidak ada jadwal ujian yang akan datang."
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
  dayList: {
    gap: 9,
    paddingTop: 22,
    paddingRight: 16,
  },
  dayButton: {
    minWidth: 54,
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  dayButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  dayButtonText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  dayButtonTextActive: {
    color: colors.white,
  },
  section: {
    marginTop: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  calendarIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
  },
  scheduleList: {
    gap: 12,
  },
  scheduleCard: {
    flexDirection: "row",
    padding: 0,
    overflow: "hidden",
  },
  courseColor: {
    width: 7,
  },
  scheduleContent: {
    flex: 1,
    padding: 16,
  },
  scheduleHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  courseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  courseCode: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  scheduleMeta: {
    gap: 8,
    marginTop: 15,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  onlineButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
  },
  onlineButtonText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "800",
  },
  examItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  examDateBox: {
    width: 52,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.warningMuted,
  },
  examDay: {
    color: colors.warning,
    fontSize: 20,
    fontWeight: "900",
  },
  examMonth: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: "900",
  },
  examHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  examTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  examCourse: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  examMeta: {
    marginTop: 5,
    color: colors.warning,
    fontSize: 11,
    fontWeight: "700",
  },
});
