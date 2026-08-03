export type Role = "STUDENT" | "ADMIN";
export type SemesterType = "ODD" | "EVEN";
export type LectureType = "OFFLINE" | "ONLINE" | "HYBRID";
export type AssignmentStatus =
  "TODO" | "IN_PROGRESS" | "SUBMITTED" | "COMPLETED" | "OVERDUE";
export type AssignmentPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ExamType =
  | "MIDTERM"
  | "FINAL"
  | "QUIZ"
  | "PRACTICUM"
  | "PRESENTATION"
  | "THESIS_DEFENSE";
export type AttendanceStatus =
  "PRESENT" | "PERMITTED" | "SICK" | "ABSENT" | "CANCELLED" | "REPLACEMENT";
export type NotificationType =
  "SYSTEM" | "ASSIGNMENT" | "SCHEDULE" | "EXAM" | "ATTENDANCE" | "GRADE";

export interface Profile {
  id: string;
  name: string;
  studentId: string | null;
  university: string | null;
  faculty: string | null;
  major: string | null;
  timezone: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  emailVerifiedAt: string | null;
  profile: Profile | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Semester {
  id: string;
  name: string;
  academicYear: string;
  type: SemesterType;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    courses: number;
  };
}

export interface Course {
  id: string;
  semesterId: string;
  code: string;
  name: string;
  credits: number;
  lecturer: string | null;
  room: string | null;
  color: string;
  notes: string | null;
  semester?: Semester;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  lectureType: LectureType;
  onlineUrl: string | null;
  reminderMinutes: number | null;
  course?: Course;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  deadline: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  attachmentUrl: string | null;
  reminderAt: string | null;
  submittedAt: string | null;
  course?: Course;
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  id: string;
  courseId: string;
  type: ExamType;
  title: string;
  examDate: string;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  topics: string | null;
  reminderAt: string | null;
  course?: Course;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  courseId: string;
  meetingDate: string;
  status: AttendanceStatus;
  notes: string | null;
  course?: Course;
  createdAt: string;
  updatedAt: string;
}

export interface GradeComponent {
  id: string;
  name: string;
  score: number;
  weight: number;
}

export interface Grade {
  id: string;
  courseId: string;
  finalScore: number | null;
  letter: string | null;
  weight: number | null;
  course?: Course;
  components: GradeComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  scheduledFor: string | null;
  createdAt: string;
}

export interface GpaSummary {
  semesterId: string | null;
  semesterName: string | null;
  totalCredits: number;
  totalQualityPoints: number;
  gpa: number;
  grades: Grade[];
}

export interface AttendanceSummary {
  total: number;
  present: number;
  permitted: number;
  sick: number;
  absent: number;
  cancelled: number;
  replacement: number;
  percentage: number;
}

export interface DashboardSummary {
  activeSemester: Semester | null;
  todaySchedules: Schedule[];
  upcomingAssignments: Assignment[];
  overdueAssignments: Assignment[];
  upcomingExams: Exam[];
  attendance: AttendanceSummary;
  gpa: GpaSummary;
  notifications: Notification[];
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
