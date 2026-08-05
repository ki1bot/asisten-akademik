import { forwardRef, useState, type ForwardedRef, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors, radii, touchTargets } from "@/constants/app-theme";

interface AppInputProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

function InputComponent(
  {
    label,
    error,
    helperText,
    leftElement,
    rightElement,
    containerStyle,
    style,
    onFocus,
    onBlur,
    multiline = false,
    selectionColor,
    editable = true,
    ...props
  }: AppInputProps,
  ref: ForwardedRef<TextInput>,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputWrapper,
          focused ? styles.inputWrapperFocused : null,
          error ? styles.inputWrapperError : null,
          !editable ? styles.inputWrapperDisabled : null,
          multiline ? styles.multilineWrapper : null,
        ]}
      >
        {leftElement ? (
          <View style={styles.leftElement}>{leftElement}</View>
        ) : null}

        <TextInput
          ref={ref}
          editable={editable}
          multiline={multiline}
          selectionColor={selectionColor ?? colors.primary}
          placeholderTextColor={colors.textSoft}
          style={[
            styles.input,
            leftElement ? styles.inputWithLeftElement : null,
            multiline ? styles.multilineInput : null,
            style,
          ]}
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

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
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
    minHeight: touchTargets.comfortable,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.medium,
    backgroundColor: colors.surface,
  },
  inputWrapperFocused: {
    borderColor: colors.success,
    backgroundColor: colors.surfaceElevated,
    shadowColor: colors.success,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  inputWrapperDisabled: {
    backgroundColor: colors.surfaceMuted,
    opacity: 0.72,
  },
  multilineWrapper: {
    minHeight: 116,
    alignItems: "flex-start",
  },
  input: {
    minHeight: touchTargets.comfortable,
    flex: 1,
    paddingHorizontal: 15,
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  inputWithLeftElement: {
    paddingLeft: 4,
  },
  multilineInput: {
    minHeight: 112,
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: "top",
  },
  leftElement: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 14,
  },
  rightElement: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
});
