import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthResponse } from "@kampushub/contracts";
import { loginSchema, type LoginInput } from "@kampushub/validation";
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
import { useRouter } from "expo-router";
import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { AppPasswordInput } from "@/components/ui/app-password-input";
import { colors } from "@/constants/app-theme";
import { api, getRequestError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginScreen() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await api.post<AuthResponse>("/auth/login", {
        ...values,
        deviceName: `KampusHub ${Platform.OS}`,
      });

      await setSession(response.data);
      router.replace("/");
    } catch (error) {
      Alert.alert("Gagal masuk", getRequestError(error));
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
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>K</Text>
            </View>

            <Text style={styles.brandName}>KampusHub</Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.eyebrow}>SELAMAT DATANG KEMBALI</Text>

            <Text style={styles.title}>Masuk ke ruang akademik Anda</Text>

            <Text style={styles.description}>
              Pantau jadwal, tugas, ujian, presensi, dan nilai dari satu
              aplikasi.
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
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
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
                  label="Password"
                  placeholder="Minimal 8 karakter"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
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

            <Pressable
              accessibilityRole="link"
              style={styles.forgotButton}
              onPress={() => router.push("/forgot-password")}
            >
              <Text style={styles.linkText}>Lupa password?</Text>
            </Pressable>

            <AppButton
              title="Masuk"
              loading={form.formState.isSubmitting}
              fullWidth
              onPress={onSubmit}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Belum memiliki akun?</Text>

            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/register")}
            >
              <Text style={styles.footerLink}>Daftar sekarang</Text>
            </Pressable>
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
    paddingTop: 20,
    paddingBottom: 36,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.primary,
  },
  logoText: {
    color: colors.white,
    fontSize: 19,
    fontWeight: "900",
  },
  brandName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.5,
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
    marginTop: 36,
    gap: 18,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginTop: -5,
    paddingVertical: 4,
  },
  linkText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 5,
    marginTop: 28,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "900",
  },
});
