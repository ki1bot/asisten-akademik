import { Ionicons } from "@expo/vector-icons";
import { useState, type ComponentProps } from "react";
import { Pressable } from "react-native";
import { AppInput } from "@/components/ui/app-input";
import { colors } from "@/constants/app-theme";

type AppPasswordInputProps = Omit<
  ComponentProps<typeof AppInput>,
  "secureTextEntry" | "rightElement"
>;

export function AppPasswordInput(props: AppPasswordInputProps) {
  const [visible, setVisible] = useState(false);

  const accessibilityLabel = visible
    ? "Sembunyikan password"
    : "Tampilkan password";

  return (
    <AppInput
      {...props}
      secureTextEntry={!visible}
      rightElement={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          hitSlop={12}
          onPress={() => setVisible((current) => !current)}
        >
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={21}
            color={colors.textMuted}
          />
        </Pressable>
      }
    />
  );
}
