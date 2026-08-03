import type { Assignment, AssignmentStatus } from "@kampushub/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
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
import { api, getRequestError } from "@/lib/api";
import {
  assignmentStatusLabels,
  formatDateTime,
  priorityLabels,
} from "@/lib/format";

type FilterValue = "ALL" | AssignmentStatus;

const filters: {
  value: FilterValue;
  label: string;
}[] = [
  {
    value: "ALL",
    label: "Semua",
  },
  {
    value: "TODO",
    label: "Belum dikerjakan",
  },
  {
    value: "IN_PROGRESS",
    label: "Dikerjakan",
  },
  {
    value: "OVERDUE",
    label: "Terlambat",
  },
  {
    value: "COMPLETED",
    label: "Selesai",
  },
];

function getStatusTone(status: AssignmentStatus) {
  if (status === "COMPLETED" || status === "SUBMITTED") {
    return "success" as const;
  }

  if (status === "OVERDUE") {
    return "danger" as const;
  }

  if (status === "IN_PROGRESS") {
    return "info" as const;
  }

  return "neutral" as const;
}

function getPriorityTone(priority: Assignment["priority"]) {
  if (priority === "URGENT" || priority === "HIGH") {
    return "danger" as const;
  }

  if (priority === "MEDIUM") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export default function AssignmentsScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterValue>("ALL");

  const query = useQuery({
    queryKey: ["mobile-assignments"],
    queryFn: async () => {
      const response = await api.get<Assignment[]>("/assignments");
      return response.data;
    },
  });

  const completeMutation = useMutation({
    mutationFn: (assignmentId: string) =>
      api.patch(`/assignments/${assignmentId}`, {
        status: "COMPLETED",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mobile-assignments"],
      });

      queryClient.invalidateQueries({
        queryKey: ["mobile-dashboard"],
      });
    },
    onError: (error) => {
      Alert.alert("Gagal memperbarui tugas", getRequestError(error));
    },
  });

  const assignments = useMemo(() => {
    if (filter === "ALL") {
      return query.data ?? [];
    }

    if (filter === "COMPLETED") {
      return (
        query.data?.filter(
          (assignment) =>
            assignment.status === "COMPLETED" ||
            assignment.status === "SUBMITTED",
        ) ?? []
      );
    }

    return (
      query.data?.filter((assignment) => assignment.status === filter) ?? []
    );
  }, [filter, query.data]);

  return (
    <Screen
      refreshing={query.isRefetching}
      onRefresh={() => {
        void query.refetch();
      }}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DEADLINE DAN PROGRES</Text>
        <Text style={styles.title}>Tugas kuliah</Text>
        <Text style={styles.description}>
          Fokus pada tugas yang paling mendesak dan perbarui status setelah
          selesai.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {filters.map((item) => {
          const active = item.value === filter;

          return (
            <Pressable
              key={item.value}
              style={[styles.filterButton, active && styles.filterButtonActive]}
              onPress={() => setFilter(item.value)}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>{assignments.length} tugas</Text>

        <Text style={styles.summaryDescription}>
          {filter === "ALL"
            ? "Seluruh tugas yang tercatat"
            : filters.find((item) => item.value === filter)?.label}
        </Text>
      </View>

      {assignments.length ? (
        <View style={styles.list}>
          {assignments.map((assignment) => {
            const completed =
              assignment.status === "COMPLETED" ||
              assignment.status === "SUBMITTED";

            return (
              <Card key={assignment.id}>
                <View style={styles.cardHeading}>
                  <View style={styles.badges}>
                    <Badge
                      label={assignmentStatusLabels[assignment.status]}
                      tone={getStatusTone(assignment.status)}
                    />

                    <Badge
                      label={priorityLabels[assignment.priority]}
                      tone={getPriorityTone(assignment.priority)}
                    />
                  </View>

                  <View
                    style={[
                      styles.courseDot,
                      {
                        backgroundColor:
                          assignment.course?.color ?? colors.success,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.assignmentTitle}>{assignment.title}</Text>

                <Text style={styles.courseName}>
                  {assignment.course?.name ?? "Mata kuliah"}
                </Text>

                {assignment.description ? (
                  <Text numberOfLines={3} style={styles.descriptionText}>
                    {assignment.description}
                  </Text>
                ) : null}

                <View style={styles.deadlineBox}>
                  <View style={styles.deadlineHeading}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={
                        assignment.status === "OVERDUE"
                          ? colors.danger
                          : colors.textMuted
                      }
                    />

                    <View style={styles.flex}>
                      <Text style={styles.deadlineLabel}>Deadline</Text>

                      <Text
                        style={[
                          styles.deadlineValue,
                          assignment.status === "OVERDUE" &&
                            styles.overdueValue,
                        ]}
                      >
                        {formatDateTime(assignment.deadline)}
                      </Text>
                    </View>
                  </View>

                  {!completed ? (
                    <Pressable
                      disabled={completeMutation.isPending}
                      style={styles.completeButton}
                      onPress={() => {
                        Alert.alert(
                          "Selesaikan tugas",
                          `Tandai "${assignment.title}" sebagai selesai?`,
                          [
                            {
                              text: "Batal",
                              style: "cancel",
                            },
                            {
                              text: "Selesaikan",
                              onPress: () =>
                                completeMutation.mutate(assignment.id),
                            },
                          ],
                        );
                      }}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color={colors.success}
                      />

                      <Text style={styles.completeButtonText}>Selesai</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.completedIcon}>
                      <Ionicons
                        name="checkmark-circle"
                        size={23}
                        color={colors.success}
                      />
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <EmptyState
          icon={
            <Ionicons
              name="checkbox-outline"
              size={26}
              color={colors.success}
            />
          }
          title="Tidak ada tugas"
          description="Tidak ditemukan tugas pada filter yang dipilih."
        />
      )}
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
  filters: {
    gap: 9,
    paddingTop: 22,
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  filterTextActive: {
    color: colors.white,
  },
  summary: {
    marginTop: 26,
    marginBottom: 13,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  summaryDescription: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
  },
  list: {
    gap: 12,
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badges: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  courseDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
  },
  assignmentTitle: {
    marginTop: 17,
    color: colors.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
  },
  courseName: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  descriptionText: {
    marginTop: 13,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 21,
  },
  deadlineBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    padding: 13,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
  },
  deadlineHeading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  deadlineLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  deadlineValue: {
    marginTop: 2,
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  overdueValue: {
    color: colors.danger,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
  },
  completeButtonText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "900",
  },
  completedIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
});
