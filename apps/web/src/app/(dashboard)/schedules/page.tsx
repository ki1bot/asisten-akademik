"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Course, Schedule } from "@kampushub/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
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
import { api, getRequestError } from "@/lib/api";
import { dayLabels, lectureTypeLabels } from "@/lib/format";

const schema = z
  .object({
    courseId: z.string().uuid("Pilih mata kuliah"),
    dayOfWeek: z
      .number()
      .int("Hari tidak valid")
      .min(1, "Hari tidak valid")
      .max(7, "Hari tidak valid"),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Format jam mulai tidak valid"),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Format jam selesai tidak valid"),
    room: z.string().max(50, "Nama ruangan maksimal 50 karakter").optional(),
    lectureType: z.enum(["OFFLINE", "ONLINE", "HYBRID"]),
    onlineUrl: z.string().max(500, "Tautan terlalu panjang").optional(),
    reminderMinutes: z
      .number()
      .int("Pengingat harus berupa bilangan bulat")
      .min(0)
      .max(10080)
      .optional(),
  })
  .refine((values) => values.startTime < values.endTime, {
    message: "Jam selesai harus setelah jam mulai",
    path: ["endTime"],
  });

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  courseId: "",
  dayOfWeek: 1,
  startTime: "08:00",
  endTime: "09:30",
  room: "",
  lectureType: "OFFLINE",
  onlineUrl: "",
  reminderMinutes: 30,
};

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  const schedulesQuery = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const response = await api.get<Schedule[]>("/schedules");

      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        room: values.room?.trim() || null,
        onlineUrl: values.onlineUrl?.trim() || null,
        reminderMinutes: values.reminderMinutes ?? null,
      };

      if (editing) {
        return api.patch(`/schedules/${editing.id}`, payload);
      }

      return api.post("/schedules", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Jadwal diperbarui" : "Jadwal ditambahkan");

      queryClient.invalidateQueries({
        queryKey: ["schedules"],
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });

      queryClient.invalidateQueries({
        queryKey: ["courses"],
      });

      closeModal();
    },
    onError: (error) => {
      toast.error(getRequestError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/schedules/${id}`),
    onSuccess: () => {
      toast.success("Jadwal dihapus");

      queryClient.invalidateQueries({
        queryKey: ["schedules"],
      });

      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });

      queryClient.invalidateQueries({
        queryKey: ["courses"],
      });
    },
    onError: (error) => {
      toast.error(getRequestError(error));
    },
  });

  const openCreate = () => {
    setEditing(null);

    form.reset({
      ...emptyValues,
      courseId: coursesQuery.data?.[0]?.id ?? "",
    });

    setModalOpen(true);
  };

  const openEdit = (schedule: Schedule) => {
    setEditing(schedule);

    form.reset({
      courseId: schedule.courseId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room ?? "",
      lectureType: schedule.lectureType,
      onlineUrl: schedule.onlineUrl ?? "",
      reminderMinutes: schedule.reminderMinutes ?? 30,
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.reset(emptyValues);
  };

  const groupedSchedules = Array.from(
    {
      length: 7,
    },
    (_, index) => index + 1,
  ).map((day) => ({
    day,
    schedules:
      schedulesQuery.data?.filter((schedule) => schedule.dayOfWeek === day) ??
      [],
  }));

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Agenda mingguan"
        title="Jadwal kuliah"
        description="Atur jam, ruang, metode perkuliahan, tautan kelas, dan pengingat."
        action={
          <Button onClick={openCreate} disabled={!coursesQuery.data?.length}>
            <Plus />
            Tambah jadwal
          </Button>
        }
      />

      {schedulesQuery.isLoading ? <LoadingState /> : null}

      {!schedulesQuery.isLoading && !schedulesQuery.data?.length ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Belum ada jadwal"
          description={
            coursesQuery.data?.length
              ? "Tambahkan jadwal perkuliahan untuk mata kuliah yang tersedia."
              : "Tambahkan mata kuliah terlebih dahulu sebelum membuat jadwal."
          }
          action={
            coursesQuery.data?.length ? (
              <Button onClick={openCreate}>
                <Plus />
                Tambah jadwal
              </Button>
            ) : null
          }
        />
      ) : null}

      {schedulesQuery.data?.length ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {groupedSchedules.map((group) => (
            <Card key={group.day} className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">
                  {dayLabels[group.day]}
                </h2>

                <Badge>{group.schedules.length} kelas</Badge>
              </div>

              <div className="mt-3">
                {group.schedules.length ? (
                  group.schedules.map((schedule) => (
                    <article
                      key={schedule.id}
                      className="flex gap-4 border-b border-[#edf0eb] py-4 last:border-0"
                    >
                      <div
                        className="w-1 shrink-0 rounded-full"
                        style={{
                          backgroundColor: schedule.course?.color ?? "#3f7b67",
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-extrabold">
                          {schedule.course?.name ?? "Mata kuliah"}
                        </h3>

                        <p className="mt-1 text-sm text-[#707b75]">
                          {schedule.startTime}–{schedule.endTime}
                          {schedule.room ? ` · ${schedule.room}` : ""}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="info">
                            {lectureTypeLabels[schedule.lectureType]}
                          </Badge>

                          {schedule.reminderMinutes !== null &&
                          schedule.reminderMinutes !== undefined ? (
                            <Badge>
                              Pengingat {schedule.reminderMinutes} menit
                            </Badge>
                          ) : null}
                        </div>

                        {schedule.onlineUrl ? (
                          <a
                            href={schedule.onlineUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block text-sm font-bold text-[#34705d] hover:underline"
                          >
                            Buka kelas daring
                          </a>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit jadwal"
                          onClick={() => openEdit(schedule)}
                        >
                          <Pencil />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Hapus jadwal"
                          onClick={() => {
                            const approved = window.confirm(
                              `Hapus jadwal ${schedule.course?.name ?? "ini"}?`,
                            );

                            if (approved) {
                              deleteMutation.mutate(schedule.id);
                            }
                          }}
                        >
                          <Trash2 className="text-[#a84c43]" />
                        </Button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="py-7 text-center text-sm text-[#909994]">
                    Tidak ada kelas.
                  </p>
                )}
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      <Modal
        open={modalOpen}
        title={editing ? "Edit jadwal" : "Tambah jadwal"}
        description="Jam selesai harus lebih besar daripada jam mulai."
        onClose={closeModal}
      >
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit((values) => {
            saveMutation.mutate(values);
          })}
        >
          <Field
            label="Mata kuliah"
            error={form.formState.errors.courseId?.message}
          >
            <Select {...form.register("courseId")}>
              <option value="">Pilih mata kuliah</option>

              {coursesQuery.data?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} · {course.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              label="Hari"
              error={form.formState.errors.dayOfWeek?.message}
            >
              <Select
                {...form.register("dayOfWeek", {
                  valueAsNumber: true,
                })}
              >
                {Object.entries(dayLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Jam mulai"
              error={form.formState.errors.startTime?.message}
            >
              <Input type="time" {...form.register("startTime")} />
            </Field>

            <Field
              label="Jam selesai"
              error={form.formState.errors.endTime?.message}
            >
              <Input type="time" {...form.register("endTime")} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Jenis perkuliahan"
              error={form.formState.errors.lectureType?.message}
            >
              <Select {...form.register("lectureType")}>
                <option value="OFFLINE">Tatap muka</option>
                <option value="ONLINE">Daring</option>
                <option value="HYBRID">Hybrid</option>
              </Select>
            </Field>

            <Field label="Ruangan" error={form.formState.errors.room?.message}>
              <Input placeholder="E231" {...form.register("room")} />
            </Field>
          </div>

          <Field
            label="Tautan kelas daring"
            error={form.formState.errors.onlineUrl?.message}
          >
            <Input
              type="url"
              placeholder="https://meet.google.com/..."
              {...form.register("onlineUrl")}
            />
          </Field>

          <Field
            label="Pengingat sebelum kelas"
            error={form.formState.errors.reminderMinutes?.message}
          >
            <Select
              {...form.register("reminderMinutes", {
                valueAsNumber: true,
              })}
            >
              <option value={0}>Tanpa pengingat</option>
              <option value={10}>10 menit</option>
              <option value={30}>30 menit</option>
              <option value={60}>1 jam</option>
              <option value={1440}>1 hari</option>
            </Select>
          </Field>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeModal}>
              Batal
            </Button>

            <Button type="submit" disabled={saveMutation.isPending}>
              {editing ? "Perbarui jadwal" : "Simpan jadwal"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
