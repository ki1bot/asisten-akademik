import type { ReactNode } from "react";
import { forwardRef, type ForwardedRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { colors, radii } from "@/constants/app-theme";

interface AppInputProps extends TextInputProps {
  label: string;
  error?: string;
  rightElement?: ReactNode;
}

function InputComponent(
  { label, error, rightElement, style, ...props }: AppInputProps,
  ref: ForwardedRef<TextInput>,
) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textSoft}
          style={[styles.input, style]}
          {...props}
        />

        {rightElement ? (
          <View style={styles.rightElement}>{rightElement}</View>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export const AppInput = forwardRef(InputComponent);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 7,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  inputWrapper: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  input: {
    minHeight: 48,
    flex: 1,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  rightElement: {
    paddingRight: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
});
