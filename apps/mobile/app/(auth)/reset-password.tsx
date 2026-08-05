import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { z } from "zod";
import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { AppPasswordInput } from "@/components/ui/app-password-input";
import { colors } from "@/constants/app-theme";
import { api, getRequestError } from "@/lib/api";

const schema = z
  .object({
    token: z.string().min(1, "Token reset wajib diisi"),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[A-Z]/, "Password harus memiliki huruf besar")
      .regex(/[a-z]/, "Password harus memiliki huruf kecil")
      .regex(/[0-9]/, "Password harus memiliki angka"),
    confirmation: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((values) => values.password === values.confirmation, {
    message: "Konfirmasi password tidak sama",
    path: ["confirmation"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    token?: string;
  }>();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      token: params.token ?? "",
      password: "",
      confirmation: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await api.post<{
        message: string;
      }>("/auth/reset-password", {
        token: values.token,
        password: values.password,
      });

      Alert.alert("Password diperbarui", response.data.message, [
        {
          text: "Masuk",
          onPress: () => router.replace("/login"),
        },
      ]);
    } catch (error) {
      Alert.alert("Reset password gagal", getRequestError(error));
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali"
            style={styles.back}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.heading}>
            <Text style={styles.eyebrow}>PASSWORD BARU</Text>

            <Text style={styles.title}>Pulihkan akses akun</Text>

            <Text style={styles.description}>
              Masukkan token reset dan password baru yang kuat.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={form.control}
              name="token"
              render={({ field, fieldState }) => (
                <AppInput
                  label="Token reset"
                  placeholder="Tempel token reset"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  value={field.value}
                  error={fieldState.error?.message}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                />
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <AppPasswordInput
                  label="Password baru"
                  helperText="Gunakan huruf besar, huruf kecil, dan angka."
                  placeholder="Huruf besar, kecil, dan angka"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  value={field.value}
                  error={fieldState.error?.message}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                />
              )}
            />

            <Controller
              control={form.control}
              name="confirmation"
              render={({ field, fieldState }) => (
                <AppPasswordInput
                  label="Konfirmasi password"
                  placeholder="Ulangi password baru"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  value={field.value}
                  error={fieldState.error?.message}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  onSubmitEditing={() => {
                    void onSubmit();
                  }}
                />
              )}
            />

            <AppButton
              title="Perbarui password"
              loading={form.formState.isSubmitting}
              fullWidth
              onPress={onSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
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
    marginTop: 42,
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
    fontSize: 34,
    lineHeight: 40,
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
    marginTop: 32,
    gap: 18,
  },
});
