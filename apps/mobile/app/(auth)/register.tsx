import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthResponse } from "@kampushub/contracts";
import { registerSchema, type RegisterInput } from "@kampushub/validation";
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
import { useRouter } from "expo-router";
import { useState } from "react";
import { AppButton } from "@/components/ui/app-button";
import { AppInput } from "@/components/ui/app-input";
import { colors } from "@/constants/app-theme";
import { api, getRequestError } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

export default function RegisterScreen() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await api.post<AuthResponse>("/auth/register", {
        ...values,
        deviceName: `KampusHub ${Platform.OS}`,
      });

      await setSession(response.data);
      router.replace("/");
    } catch (error) {
      Alert.alert("Pendaftaran gagal", getRequestError(error));
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
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.heading}>
            <Text style={styles.eyebrow}>AKUN MAHASISWA BARU</Text>
            <Text style={styles.title}>Mulai mengatur kegiatan kuliah</Text>
            <Text style={styles.description}>
              Buat akun untuk menyimpan seluruh aktivitas akademik pada satu
              ruang kerja.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <AppInput
                  label="Nama lengkap"
                  placeholder="Nama mahasiswa"
                  autoComplete="name"
                  value={field.value}
                  error={fieldState.error?.message}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                />
              )}
            />

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

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <AppInput
                  label="Password"
                  placeholder="Huruf besar, kecil, dan angka"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  value={field.value}
                  error={fieldState.error?.message}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  rightElement={
                    <Pressable
                      hitSlop={12}
                      onPress={() => setShowPassword((current) => !current)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={21}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  }
                />
              )}
            />

            <AppButton
              title="Buat akun"
              loading={form.formState.isSubmitting}
              fullWidth
              onPress={onSubmit}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sudah memiliki akun?</Text>

            <Pressable onPress={() => router.replace("/login")}>
              <Text style={styles.footerLink}>Masuk</Text>
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
    marginTop: 38,
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
  footer: {
    flexDirection: "row",
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
