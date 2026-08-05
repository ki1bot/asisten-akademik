import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui/card";
import { colors, radii } from "@/constants/app-theme";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card style={styles.container}>
      <View style={styles.icon}>{icon}</View>

      <Text style={styles.title}>{title}</Text>

      <Text style={styles.description}>{description}</Text>

      {action ? <View style={styles.action}>{action}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 34,
  },
  icon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.large,
    backgroundColor: colors.primaryMuted,
  },
  title: {
    marginTop: 18,
    color: colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  description: {
    maxWidth: 320,
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  action: {
    width: "100%",
    maxWidth: 280,
    marginTop: 20,
  },
});
