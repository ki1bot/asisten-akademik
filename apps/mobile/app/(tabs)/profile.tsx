import type { User } from "@kampushub/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/screen";
import { Card } from "@/components/ui/card";
import { AppButton } from "@/components/ui/app-button";
import { colors } from "@/constants/app-theme";
import { api, apiBaseUrl, getRequestError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";

interface Session {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  lastUsedAt: string;
  createdAt: string;
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.profileRow}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.success} />
      </View>

      <View style={styles.flex}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);

  const profileQuery = useQuery({
    queryKey: ["mobile-profile"],
    queryFn: async () => {
      const response = await api.get<User>("/auth/me");
      await setUser(response.data);
      return response.data;
    },
    initialData: user ?? undefined,
  });

  const sessionsQuery = useQuery({
    queryKey: ["mobile-sessions"],
    queryFn: async () => {
      const response = await api.get<Session[]>("/auth/sessions");
      return response.data;
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) =>
      api.delete(`/auth/sessions/${sessionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mobile-sessions"],
      });
    },
    onError: (error) => {
      Alert.alert("Gagal menghentikan sesi", getRequestError(error));
    },
  });

  const currentUser = profileQuery.data ?? user;
  const profile = currentUser?.profile;
  const displayName = profile?.name ?? "Mahasiswa";

  const logout = () => {
    Alert.alert(
      "Keluar dari akun",
      "Sesi pada perangkat ini akan dihentikan.",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post("/auth/logout");
            } catch {
              await clearSession();
              router.replace("/login");
              return;
            }

            await clearSession();
            queryClient.clear();
            router.replace("/login");
          },
        },
      ],
    );
  };

  const logoutAll = () => {
    Alert.alert(
      "Hentikan semua sesi",
      "Semua perangkat yang menggunakan akun ini akan dikeluarkan.",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Hentikan semua",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post("/auth/logout-all");
              await clearSession();
              queryClient.clear();
              router.replace("/login");
            } catch (error) {
              Alert.alert("Gagal menghentikan sesi", getRequestError(error));
            }
          },
        },
      ],
    );
  };

  return (
    <Screen
      refreshing={profileQuery.isRefetching || sessionsQuery.isRefetching}
      onRefresh={() => {
        void Promise.all([profileQuery.refetch(), sessionsQuery.refetch()]);
      }}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>AKUN DAN KEAMANAN</Text>
        <Text style={styles.title}>Profil</Text>
        <Text style={styles.description}>
          Informasi akun, identitas akademik, dan sesi yang sedang aktif.
        </Text>
      </View>

      <Card style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{currentUser?.email}</Text>

        <View style={styles.roleBadge}>
          <Ionicons name="school-outline" size={16} color={colors.success} />
          <Text style={styles.roleText}>Mahasiswa</Text>
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informasi akademik</Text>

        <Card style={styles.infoCard}>
          <ProfileRow
            icon="id-card-outline"
            label="Nomor mahasiswa"
            value={profile?.studentId || "Belum diisi"}
          />

          <ProfileRow
            icon="business-outline"
            label="Universitas"
            value={profile?.university || "Belum diisi"}
          />

          <ProfileRow
            icon="library-outline"
            label="Fakultas"
            value={profile?.faculty || "Belum diisi"}
          />

          <ProfileRow
            icon="book-outline"
            label="Program studi"
            value={profile?.major || "Belum diisi"}
          />

          <ProfileRow
            icon="globe-outline"
            label="Zona waktu"
            value={profile?.timezone || "Asia/Jakarta"}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perangkat dan sesi</Text>

        <Text style={styles.sectionDescription}>
          Hentikan sesi yang sudah tidak digunakan atau tidak dikenali.
        </Text>

        <Card style={styles.sessionsCard}>
          {sessionsQuery.data?.length ? (
            sessionsQuery.data.map((session) => (
              <View key={session.id} style={styles.sessionItem}>
                <View style={styles.deviceIcon}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={20}
                    color={colors.info}
                  />
                </View>

                <View style={styles.flex}>
                  <Text style={styles.deviceName}>
                    {session.deviceName || "Perangkat tidak dikenal"}
                  </Text>

                  <Text style={styles.sessionMeta}>
                    {session.ipAddress || "IP tidak tersedia"}
                  </Text>

                  <Text style={styles.lastUsed}>
                    Digunakan {formatDateTime(session.lastUsedAt)}
                  </Text>
                </View>

                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    Alert.alert(
                      "Hentikan sesi",
                      `Hentikan sesi pada ${session.deviceName || "perangkat ini"}?`,
                      [
                        {
                          text: "Batal",
                          style: "cancel",
                        },
                        {
                          text: "Hentikan",
                          style: "destructive",
                          onPress: () => revokeMutation.mutate(session.id),
                        },
                      ],
                    );
                  }}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={24}
                    color={colors.danger}
                  />
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={styles.emptySessions}>Tidak ada sesi aktif.</Text>
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Konfigurasi koneksi</Text>

        <Card>
          <Text style={styles.apiLabel}>API SERVER</Text>
          <Text selectable style={styles.apiValue}>
            {apiBaseUrl}
          </Text>
        </Card>
      </View>

      <View style={styles.actions}>
        <AppButton
          title="Keluar dari perangkat ini"
          variant="outline"
          fullWidth
          leftIcon={
            <Ionicons name="log-out-outline" size={20} color={colors.text} />
          }
          onPress={logout}
        />

        <AppButton
          title="Hentikan semua sesi"
          variant="danger"
          fullWidth
          leftIcon={
            <Ionicons name="shield-outline" size={20} color={colors.white} />
          }
          onPress={logoutAll}
        />
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
  identityCard: {
    alignItems: "center",
    marginTop: 24,
    paddingVertical: 26,
  },
  avatar: {
    width: 74,
    height: 74,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    backgroundColor: "#E5C996",
  },
  avatarText: {
    color: "#493819",
    fontSize: 29,
    fontWeight: "900",
  },
  name: {
    marginTop: 17,
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
  },
  email: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 13,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primaryMuted,
  },
  roleText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "900",
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sectionDescription: {
    marginTop: 5,
    marginBottom: 12,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 19,
  },
  infoCard: {
    marginTop: 13,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.primaryMuted,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  rowValue: {
    marginTop: 3,
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  sessionsCard: {
    paddingVertical: 5,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  deviceIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.infoMuted,
  },
  deviceName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  sessionMeta: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
  },
  lastUsed: {
    marginTop: 4,
    color: colors.textSoft,
    fontSize: 10,
  },
  emptySessions: {
    paddingVertical: 24,
    color: colors.textMuted,
    textAlign: "center",
  },
  apiLabel: {
    color: colors.textSoft,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  apiValue: {
    marginTop: 8,
    color: colors.text,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
  },
  actions: {
    gap: 11,
    marginTop: 30,
  },
});
