import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows } from "@/constants/app-theme";

export function LoadingScreen({
  message = "Menyiapkan KampusHub",
}: {
  message?: string;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>K</Text>
        </View>

        <Text style={styles.brandName}>KampusHub</Text>
      </View>

      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: 24,
  },
  brand: {
    alignItems: "center",
  },
  logo: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.large,
    backgroundColor: colors.primary,
    ...shadows.elevated,
  },
  logoText: {
    color: colors.white,
    fontSize: 25,
    fontWeight: "900",
  },
  brandName: {
    marginTop: 14,
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
});
