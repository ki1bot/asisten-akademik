export const dayLabels: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

export const shortDayLabels: Record<number, string> = {
  1: "Sen",
  2: "Sel",
  3: "Rab",
  4: "Kam",
  5: "Jum",
  6: "Sab",
  7: "Min",
};

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
  PRACTICUM: "Praktikum",
  PRESENTATION: "Presentasi",
  THESIS_DEFENSE: "Sidang",
} as const;

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getCurrentDayNumber(): number {
  const day = new Date().getDay();

  return day === 0 ? 7 : day;
}

export function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 11) {
    return "Selamat pagi";
  }

  if (hour < 15) {
    return "Selamat siang";
  }

  if (hour < 18) {
    return "Selamat sore";
  }

  return "Selamat malam";
}
