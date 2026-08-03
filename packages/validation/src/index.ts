import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100),
  email: z.string().email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Password harus memiliki huruf besar")
    .regex(/[a-z]/, "Password harus memiliki huruf kecil")
    .regex(/[0-9]/, "Password harus memiliki angka"),
});

export const semesterSchema = z.object({
  name: z.string().min(2, "Nama semester minimal 2 karakter").max(50),
  academicYear: z.string().regex(/^\d{4}\/\d{4}$/, "Gunakan format 2026/2027"),
  type: z.enum(["ODD", "EVEN"]),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().min(1, "Tanggal selesai wajib diisi"),
  isActive: z.boolean(),
});

export const courseSchema = z.object({
  semesterId: z.string().uuid("Pilih semester"),
  code: z.string().min(2, "Kode minimal 2 karakter").max(20),
  name: z.string().min(2, "Nama minimal 2 karakter").max(120),
  credits: z.number().int().min(1).max(12),
  lecturer: z.string().max(120).optional().nullable(),
  room: z.string().max(50).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Format warna tidak valid"),
  notes: z.string().max(2000).optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SemesterInput = z.infer<typeof semesterSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
