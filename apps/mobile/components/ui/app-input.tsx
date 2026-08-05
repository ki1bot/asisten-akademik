import { forwardRef, useState, type ForwardedRef, type ReactNode } from "react";
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
  {
    label,
    error,
    rightElement,
    style,
    onFocus,
    onBlur,
    multiline = false,
    selectionColor,
    ...props
  }: AppInputProps,
  ref: ForwardedRef<TextInput>,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
          multiline && styles.multilineWrapper,
        ]}
      >
        <TextInput
          ref={ref}
          multiline={multiline}
          selectionColor={selectionColor ?? colors.primary}
          placeholderTextColor={colors.textSoft}
          style={[styles.input, multiline && styles.multilineInput, style]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
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
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  inputWrapper: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
  },
  inputWrapperFocused: {
    borderColor: colors.success,
    backgroundColor: colors.surfaceElevated,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  multilineWrapper: {
    minHeight: 112,
    alignItems: "flex-start",
  },
  input: {
    minHeight: 50,
    flex: 1,
    paddingHorizontal: 15,
    color: colors.text,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 108,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: "top",
  },
  rightElement: {
    alignSelf: "stretch",
    justifyContent: "center",
    paddingRight: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
});
