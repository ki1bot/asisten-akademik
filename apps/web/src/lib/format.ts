const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function toDateInput(value?: string | Date | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function toDateTimeInput(value?: string | Date | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const datePart = toDateInput(date);
  const timePart = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;

  return `${datePart}T${timePart}`;
}

export const dayLabels: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

export const semesterTypeLabels = {
  ODD: "Ganjil",
  EVEN: "Genap",
} as const;

export const lectureTypeLabels = {
  OFFLINE: "Tatap muka",
  ONLINE: "Daring",
  HYBRID: "Hybrid",
} as const;

export const assignmentStatusLabels = {
  TODO: "Belum dikerjakan",
  IN_PROGRESS: "Sedang dikerjakan",
  SUBMITTED: "Sudah dikumpulkan",
  COMPLETED: "Selesai",
  OVERDUE: "Terlambat",
} as const;

export const priorityLabels = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  URGENT: "Mendesak",
} as const;

export const examTypeLabels = {
  MIDTERM: "UTS",
  FINAL: "UAS",
  QUIZ: "Kuis",
  PRACTICUM: "Ujian praktikum",
  PRESENTATION: "Presentasi",
  THESIS_DEFENSE: "Sidang",
} as const;

export const attendanceStatusLabels = {
  PRESENT: "Hadir",
  PERMITTED: "Izin",
  SICK: "Sakit",
  ABSENT: "Alpa",
  CANCELLED: "Kelas dibatalkan",
  REPLACEMENT: "Kelas pengganti",
} as const;
