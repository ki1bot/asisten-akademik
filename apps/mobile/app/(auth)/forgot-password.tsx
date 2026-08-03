import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { z } from "zod";
import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { colors } from "@/constants/app-theme";
import { api, getRequestError } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Format email tidak valid"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await api.post<{
        message: string;
        resetToken?: string;
      }>("/auth/forgot-password", values);

      if (response.data.resetToken) {
        Alert.alert("Token pengembangan", response.data.resetToken, [
          {
            text: "Tutup",
          },
          {
            text: "Masukkan token",
            onPress: () =>
              router.push({
                pathname: "/reset-password",
                params: {
                  token: response.data.resetToken,
                },
              }),
          },
        ]);

        return;
      }

      Alert.alert("Permintaan diterima", response.data.message);
    } catch (error) {
      Alert.alert("Permintaan gagal", getRequestError(error));
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>PEMULIHAN AKUN</Text>
          <Text style={styles.title}>Lupa password</Text>
          <Text style={styles.description}>
            Masukkan email akun untuk membuat token penggantian password.
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <AppInput
                label="Email"
                placeholder="nama@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={field.value}
                error={fieldState.error?.message}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
              />
            )}
          />

          <AppButton
            title="Buat token reset"
            loading={form.formState.isSubmitting}
            fullWidth
            onPress={onSubmit}
          />
        </View>

        <Pressable
          style={styles.resetLink}
          onPress={() => router.push("/reset-password")}
        >
          <Text style={styles.resetLinkText}>Sudah memiliki token reset?</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  heading: {
    marginTop: 54,
  },
  eyebrow: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.7,
  },
  title: {
    marginTop: 12,
    color: colors.text,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  description: {
    marginTop: 14,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
  },
  form: {
    marginTop: 36,
    gap: 20,
  },
  resetLink: {
    alignSelf: "center",
    marginTop: 26,
  },
  resetLinkText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "800",
  },
});
