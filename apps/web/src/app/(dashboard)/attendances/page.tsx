"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  Attendance,
  AttendanceSummary,
  Course,
} from "@kampushub/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, getRequestError } from "@/lib/api";
import { attendanceStatusLabels, formatDate, toDateInput } from "@/lib/format";

const schema = z.object({
  courseId: z.string().uuid("Pilih mata kuliah"),
  meetingDate: z.string().min(1),
  status: z.enum([
    "PRESENT",
    "PERMITTED",
    "SICK",
    "ABSENT",
    "CANCELLED",
    "REPLACEMENT",
  ]),
  notes: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  courseId: "",
  meetingDate: "",
  status: "PRESENT",
  notes: "",
};

function attendanceVariant(status: Attendance["status"]) {
  if (status === "PRESENT" || status === "REPLACEMENT") {
    return "success" as const;
  }

  if (status === "ABSENT") {
    return "danger" as const;
  }

  if (status === "PERMITTED" || status === "SICK") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export default function AttendancesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Attendance | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const response = await api.get<Course[]>("/courses");
      return response.data;
    },
  });

  const attendancesQuery = useQuery({
    queryKey: ["attendances", courseFilter],
    queryFn: async () => {
      const response = await api.get<Attendance[]>("/attendances", {
        params: courseFilter
          ? {
              courseId: courseFilter,
            }
          : undefined,
      });
      return response.data;
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["attendances", "summary", courseFilter],
    queryFn: async () => {
      const response = await api.get<AttendanceSummary>(
        "/attendances/summary",
        {
          params: courseFilter
            ? {
                courseId: courseFilter,
              }
            : undefined,
        },
      );
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        meetingDate: new Date(`${values.meetingDate}T12:00:00`).toISOString(),
        notes: values.notes || null,
      };

      if (editing) {
        return api.patch(`/attendances/${editing.id}`, payload);
      }

      return api.post("/attendances", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Presensi diperbarui" : "Presensi dicatat");
      queryClient.invalidateQueries({
        queryKey: ["attendances"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
      closeModal();
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/attendances/${id}`),
    onSuccess: () => {
      toast.success("Presensi dihapus");
      queryClient.invalidateQueries({
        queryKey: ["attendances"],
      });
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      ...emptyValues,
      courseId: courseFilter || coursesQuery.data?.[0]?.id || "",
      meetingDate: toDateInput(new Date()),
    });
    setModalOpen(true);
  };

  const openEdit = (attendance: Attendance) => {
    setEditing(attendance);
    form.reset({
      courseId: attendance.courseId,
      meetingDate: toDateInput(attendance.meetingDate),
      status: attendance.status,
      notes: attendance.notes ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const summary = summaryQuery.data;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Kehadiran pribadi"
        title="Presensi"
        description="Catat status kehadiran setiap pertemuan untuk melihat risiko absensi lebih awal."
        action={
          <Button onClick={openCreate} disabled={!coursesQuery.data?.length}>
            <Plus />
            Catat presensi
          </Button>
        }
      />

      <div className="max-w-sm">
        <Select
          value={courseFilter}
          onChange={(event) => setCourseFilter(event.target.value)}
        >
          <option value="">Semua mata kuliah</option>
          {coursesQuery.data?.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} · {course.name}
            </option>
          ))}
        </Select>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7c8881]">
            Kehadiran
          </p>
          <p className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-[#286553]">
            {summary?.percentage ?? 0}%
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7c8881]">
            Hadir
          </p>
          <p className="mt-4 text-4xl font-extrabold tracking-[-0.05em]">
            {summary?.present ?? 0}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7c8881]">
            Izin dan sakit
          </p>
          <p className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-[#8a692c]">
            {(summary?.permitted ?? 0) + (summary?.sick ?? 0)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7c8881]">
            Alpa
          </p>
          <p className="mt-4 text-4xl font-extrabold tracking-[-0.05em] text-[#a84c43]">
            {summary?.absent ?? 0}
          </p>
        </Card>
      </section>

      {attendancesQuery.isLoading ? <LoadingState /> : null}

      {!attendancesQuery.isLoading && !attendancesQuery.data?.length ? (
        <EmptyState
          icon={<ClipboardCheck />}
          title="Belum ada catatan presensi"
          description="Catat kehadiran setelah perkuliahan selesai."
          action={
            coursesQuery.data?.length ? (
              <Button onClick={openCreate}>
                <Plus />
                Catat presensi
              </Button>
            ) : null
          }
        />
      ) : null}

      {attendancesQuery.data?.length ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-[#f0f3ed] text-xs uppercase tracking-[0.12em] text-[#748079]">
                <tr>
                  <th className="px-5 py-4">Tanggal</th>
                  <th className="px-5 py-4">Mata kuliah</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Catatan</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {attendancesQuery.data.map((attendance) => (
                  <tr key={attendance.id} className="border-t border-[#edf0eb]">
                    <td className="px-5 py-4 text-sm font-bold">
                      {formatDate(attendance.meetingDate)}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {attendance.course?.name}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={attendanceVariant(attendance.status)}>
                        {attendanceStatusLabels[attendance.status]}
                      </Badge>
                    </td>
                    <td className="max-w-xs truncate px-5 py-4 text-sm text-[#748079]">
                      {attendance.notes || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(attendance)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm("Hapus presensi ini?")) {
                              deleteMutation.mutate(attendance.id);
                            }
                          }}
                        >
                          <Trash2 className="text-[#a84c43]" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Modal
        open={modalOpen}
        title={editing ? "Edit presensi" : "Catat presensi"}
        onClose={closeModal}
      >
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <Field label="Mata kuliah">
            <Select {...form.register("courseId")}>
              <option value="">Pilih mata kuliah</option>
              {coursesQuery.data?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} · {course.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Tanggal pertemuan">
              <Input type="date" {...form.register("meetingDate")} />
            </Field>
            <Field label="Status">
              <Select {...form.register("status")}>
                {Object.entries(attendanceStatusLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>

          <Field label="Catatan">
            <Textarea
              placeholder="Informasi tambahan mengenai pertemuan"
              {...form.register("notes")}
            />
          </Field>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              Simpan presensi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
