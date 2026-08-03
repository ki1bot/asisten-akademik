import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/app-theme";

export function LoadingScreen({
  message = "Menyiapkan KampusHub",
}: {
  message?: string;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>K</Text>
      </View>

      <ActivityIndicator
        size="small"
        color={colors.primary}
        style={styles.indicator}
      />

      <Text style={styles.message}>{message}</Text>
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
  logo: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  logoText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "900",
  },
  indicator: {
    marginTop: 24,
  },
  message: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
});
