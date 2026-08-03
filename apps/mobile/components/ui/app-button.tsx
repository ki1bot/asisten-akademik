import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, radii } from "@/constants/app-theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";

interface AppButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  title,
  variant = "primary",
  loading = false,
  leftIcon,
  fullWidth = false,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" ||
            variant === "ghost" ||
            variant === "secondary"
              ? colors.primary
              : colors.white
          }
        />
      ) : (
        leftIcon
      )}

      <Text
        style={[
          styles.text,
          variant === "outline" && styles.outlineText,
          variant === "ghost" && styles.ghostText,
          variant === "secondary" && styles.secondaryText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: radii.medium,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primaryMuted,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  text: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  outlineText: {
    color: colors.text,
  },
  ghostText: {
    color: colors.primary,
  },
  secondaryText: {
    color: colors.primary,
  },
  fullWidth: {
    width: "100%",
  },
  pressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.99,
      },
    ],
  },
  disabled: {
    opacity: 0.5,
  },
});
