import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, radii, shadows, touchTargets } from "@/constants/app-theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";

type ButtonSize = "small" | "default" | "large";

interface AppButtonProps extends Omit<PressableProps, "style"> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function AppButton({
  title,
  variant = "primary",
  size = "default",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  style,
  textStyle,
  ...props
}: AppButtonProps) {
  const inactive = disabled || loading;

  const indicatorColor =
    variant === "primary" || variant === "danger"
      ? colors.white
      : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: inactive,
        busy: loading,
      }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        styles[`size_${size}`],
        styles[variant],
        variant === "primary" && styles.primaryShadow,
        fullWidth && styles.fullWidth,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={indicatorColor} />
      ) : (
        leftIcon
      )}

      <Text
        numberOfLines={1}
        style={[
          styles.text,
          styles[`${variant}Text`],
          size === "large" && styles.largeText,
          textStyle,
        ]}
      >
        {title}
      </Text>

      {!loading ? rightIcon : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: radii.medium,
  },
  size_small: {
    minHeight: touchTargets.minimum,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  size_default: {
    minHeight: touchTargets.comfortable,
    paddingHorizontal: 19,
    paddingVertical: 11,
  },
  size_large: {
    minHeight: touchTargets.large,
    paddingHorizontal: 23,
    paddingVertical: 13,
    borderRadius: radii.large,
  },
  primary: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  primaryShadow: {
    ...shadows.soft,
  },
  secondary: {
    borderColor: colors.primaryMuted,
    backgroundColor: colors.primaryMuted,
  },
  outline: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  danger: {
    borderColor: colors.danger,
    backgroundColor: colors.danger,
  },
  ghost: {
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  text: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  largeText: {
    fontSize: 15,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.primary,
  },
  outlineText: {
    color: colors.text,
  },
  dangerText: {
    color: colors.white,
  },
  ghostText: {
    color: colors.primary,
  },
  fullWidth: {
    width: "100%",
  },
  pressed: {
    opacity: 0.9,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },
  disabled: {
    opacity: 0.5,
  },
});
