import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, shadows } from "@/constants/app-theme";

type CardVariant = "default" | "elevated" | "muted" | "outline";
type CardPadding = "none" | "small" | "default" | "large";

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  padding?: CardPadding;
}

export function Card({
  children,
  style,
  variant = "default",
  padding = "default",
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        styles[variant],
        styles[`padding_${padding}`],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    borderRadius: radii.large,
  },
  default: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  elevated: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    ...shadows.elevated,
  },
  muted: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "transparent",
  },
  padding_none: {
    padding: 0,
  },
  padding_small: {
    padding: 12,
  },
  padding_default: {
    padding: 17,
  },
  padding_large: {
    padding: 22,
  },
});
