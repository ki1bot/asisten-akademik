import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, radii } from "@/constants/app-theme";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export function Badge({
  label,
  tone = "neutral",
  style,
}: {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.base, styles[`${tone}Background`], style]}>
      <Text style={[styles.text, styles[`${tone}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.round,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
  },
  neutralBackground: {
    backgroundColor: colors.surfaceMuted,
  },
  neutralText: {
    color: colors.textMuted,
  },
  successBackground: {
    backgroundColor: colors.successMuted,
  },
  successText: {
    color: colors.success,
  },
  warningBackground: {
    backgroundColor: colors.warningMuted,
  },
  warningText: {
    color: colors.warning,
  },
  dangerBackground: {
    backgroundColor: colors.dangerMuted,
  },
  dangerText: {
    color: colors.danger,
  },
  infoBackground: {
    backgroundColor: colors.infoMuted,
  },
  infoText: {
    color: colors.info,
  },
});
