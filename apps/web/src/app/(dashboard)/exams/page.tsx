"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Course, Exam } from "@kampushub/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  examTypeLabels,
  formatDate,
  toDateInput,
  toDateTimeInput,
} from "@/lib/format";

const schema = z.object({
  courseId: z.string().uuid("Pilih mata kuliah"),
  type: z.enum([
    "MIDTERM",
    "FINAL",
    "QUIZ",
    "PRACTICUM",
    "PRESENTATION",
    "THESIS_DEFENSE",
  ]),
  title: z.string().min(2).max(160),
  examDate: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  room: z.string().max(50).optional(),
  topics: z.string().max(5000).optional(),
  reminderAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  courseId: "",
  type: "MIDTERM",
  title: "",
  examDate: "",
  startTime: "",
  endTime: "",
  room: "",
  topics: "",
  reminderAt: "",
};

export default function ExamsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Exam | null>(null);
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

  const examsQuery = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const response = await api.get<Exam[]>("/exams");
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        examDate: new Date(`${values.examDate}T00:00:00`).toISOString(),
        startTime: values.startTime || null,
        endTime: values.endTime || null,
        room: values.room || null,
        topics: values.topics || null,
        reminderAt: values.reminderAt
          ? new Date(values.reminderAt).toISOString()
          : null,
      };

      if (editing) {
        return api.patch(`/exams/${editing.id}`, payload);
      }

      return api.post("/exams", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Ujian diperbarui" : "Ujian ditambahkan");
      queryClient.invalidateQueries({
        queryKey: ["exams"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
      closeModal();
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/exams/${id}`),
    onSuccess: () => {
      toast.success("Ujian dihapus");
      queryClient.invalidateQueries({
        queryKey: ["exams"],
      });
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      ...emptyValues,
      courseId: coursesQuery.data?.[0]?.id ?? "",
    });
    setModalOpen(true);
  };

  const openEdit = (exam: Exam) => {
    setEditing(exam);
    form.reset({
      courseId: exam.courseId,
      type: exam.type,
      title: exam.title,
      examDate: toDateInput(exam.examDate),
      startTime: exam.startTime ?? "",
      endTime: exam.endTime ?? "",
      room: exam.room ?? "",
      topics: exam.topics ?? "",
      reminderAt: toDateTimeInput(exam.reminderAt),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Evaluasi akademik"
        title="Ujian"
        description="Catat tanggal, waktu, ruangan, serta cakupan materi yang akan diuji."
        action={
          <Button onClick={openCreate} disabled={!coursesQuery.data?.length}>
            <Plus />
            Tambah ujian
          </Button>
        }
      />

      {examsQuery.isLoading ? <LoadingState /> : null}

      {!examsQuery.isLoading && !examsQuery.data?.length ? (
        <EmptyState
          icon={<GraduationCap />}
          title="Belum ada jadwal ujian"
          description="Tambahkan UTS, UAS, kuis, praktikum, presentasi, atau sidang."
          action={
            coursesQuery.data?.length ? (
              <Button onClick={openCreate}>
                <Plus />
                Tambah ujian
              </Button>
            ) : null
          }
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {examsQuery.data?.map((exam) => (
          <Card key={exam.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <Badge variant="warning">{examTypeLabels[exam.type]}</Badge>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(exam)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (window.confirm("Hapus ujian ini?")) {
                      deleteMutation.mutate(exam.id);
                    }
                  }}
                >
                  <Trash2 className="text-[#a84c43]" />
                </Button>
              </div>
            </div>

            <h2 className="mt-4 text-xl font-extrabold tracking-[-0.03em]">
              {exam.title}
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#6d7972]">
              {exam.course?.name}
            </p>

            <div className="mt-6 rounded-2xl bg-[#f3eee2] p-4">
              <p className="text-xs font-semibold text-[#806f4f]">
                Pelaksanaan
              </p>
              <p className="mt-2 font-extrabold">{formatDate(exam.examDate)}</p>
              <p className="mt-1 text-sm text-[#7e735e]">
                {exam.startTime || "Waktu belum ditentukan"}
                {exam.endTime ? `–${exam.endTime}` : ""}
                {exam.room ? ` · ${exam.room}` : ""}
              </p>
            </div>

            {exam.topics ? (
              <p className="mt-5 line-clamp-3 text-sm leading-6 text-[#758079]">
                {exam.topics}
              </p>
            ) : null}
          </Card>
        ))}
      </section>

      <Modal
        open={modalOpen}
        title={editing ? "Edit ujian" : "Tambah ujian"}
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

          <div className="grid gap-5 sm:grid-cols-[0.7fr_1.3fr]">
            <Field label="Jenis ujian">
              <Select {...form.register("type")}>
                {Object.entries(examTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Judul ujian">
              <Input
                placeholder="UTS Analisis Sistem"
                {...form.register("title")}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Tanggal">
              <Input type="date" {...form.register("examDate")} />
            </Field>
            <Field label="Jam mulai">
              <Input type="time" {...form.register("startTime")} />
            </Field>
            <Field label="Jam selesai">
              <Input type="time" {...form.register("endTime")} />
            </Field>
          </div>

          <Field label="Ruangan">
            <Input placeholder="E231" {...form.register("room")} />
          </Field>

          <Field label="Materi yang diuji">
            <Textarea
              placeholder="Bab, topik, atau kompetensi yang perlu dipelajari"
              {...form.register("topics")}
            />
          </Field>

          <Field label="Pengingat">
            <Input type="datetime-local" {...form.register("reminderAt")} />
          </Field>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              Simpan ujian
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
