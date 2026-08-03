"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Course, Semester } from "@kampushub/contracts";
import { courseSchema, type CourseInput } from "@kampushub/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, getRequestError } from "@/lib/api";

interface CourseWithCount extends Course {
  _count?: {
    schedules: number;
    assignments: number;
    exams: number;
    attendances: number;
  };
}

const emptyValues: CourseInput = {
  semesterId: "",
  code: "",
  name: "",
  credits: 3,
  lecturer: "",
  room: "",
  color: "#3F7B67",
  notes: "",
};

export default function CoursesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CourseWithCount | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [semesterFilter, setSemesterFilter] = useState("");

  const form = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: emptyValues,
  });

  const semestersQuery = useQuery({
    queryKey: ["semesters"],
    queryFn: async () => {
      const response = await api.get<Semester[]>("/semesters");
      return response.data;
    },
  });

  const coursesQuery = useQuery({
    queryKey: ["courses", semesterFilter],
    queryFn: async () => {
      const response = await api.get<CourseWithCount[]>("/courses", {
        params: semesterFilter
          ? {
              semesterId: semesterFilter,
            }
          : undefined,
      });

      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: CourseInput) => {
      if (editing) {
        return api.patch(`/courses/${editing.id}`, values);
      }

      return api.post("/courses", values);
    },
    onSuccess: () => {
      toast.success(
        editing ? "Mata kuliah diperbarui" : "Mata kuliah ditambahkan",
      );
      queryClient.invalidateQueries({
        queryKey: ["courses"],
      });
      closeModal();
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${id}`),
    onSuccess: () => {
      toast.success("Mata kuliah dihapus");
      queryClient.invalidateQueries({
        queryKey: ["courses"],
      });
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const openCreate = () => {
    const activeSemester = semestersQuery.data?.find(
      (semester) => semester.isActive,
    );

    setEditing(null);
    form.reset({
      ...emptyValues,
      semesterId: activeSemester?.id ?? semestersQuery.data?.[0]?.id ?? "",
    });
    setModalOpen(true);
  };

  const openEdit = (course: CourseWithCount) => {
    setEditing(course);
    form.reset({
      semesterId: course.semesterId,
      code: course.code,
      name: course.name,
      credits: course.credits,
      lecturer: course.lecturer ?? "",
      room: course.room ?? "",
      color: course.color,
      notes: course.notes ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.reset(emptyValues);
  };

  const remove = (course: CourseWithCount) => {
    if (
      window.confirm(
        `Hapus mata kuliah ${course.name}? Jadwal, tugas, ujian, presensi, dan nilai ikut dihapus.`,
      )
    ) {
      deleteMutation.mutate(course.id);
    }
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Kurikulum pribadi"
        title="Mata kuliah"
        description="Kelola mata kuliah berdasarkan semester dan gunakan identitas warna agar agenda mudah dibaca."
        action={
          <Button onClick={openCreate} disabled={!semestersQuery.data?.length}>
            <Plus />
            Tambah mata kuliah
          </Button>
        }
      />

      <div className="max-w-sm">
        <Select
          value={semesterFilter}
          onChange={(event) => setSemesterFilter(event.target.value)}
        >
          <option value="">Semua semester</option>
          {semestersQuery.data?.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name} · {semester.academicYear}
            </option>
          ))}
        </Select>
      </div>

      {coursesQuery.isLoading ? <LoadingState /> : null}

      {!coursesQuery.isLoading && !coursesQuery.data?.length ? (
        <EmptyState
          icon={<BookOpen />}
          title="Belum ada mata kuliah"
          description={
            semestersQuery.data?.length
              ? "Tambahkan mata kuliah yang sedang Anda ambil."
              : "Buat semester terlebih dahulu sebelum menambahkan mata kuliah."
          }
          action={
            semestersQuery.data?.length ? (
              <Button onClick={openCreate}>
                <Plus />
                Tambah mata kuliah
              </Button>
            ) : null
          }
        />
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {coursesQuery.data?.map((course) => (
          <Card key={course.id} className="overflow-hidden">
            <div
              className="h-2"
              style={{
                backgroundColor: course.color,
              }}
            />
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#819087]">
                    {course.code}
                  </p>
                  <h2 className="mt-2 truncate text-xl font-extrabold tracking-[-0.03em]">
                    {course.name}
                  </h2>
                  <p className="mt-2 text-sm text-[#747f79]">
                    {course.credits} SKS · {course.semester?.name}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(course)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(course)}
                  >
                    <Trash2 className="text-[#a84c43]" />
                  </Button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-[#f1f3ee] p-4">
                <p className="text-xs font-semibold text-[#7d8882]">Dosen</p>
                <p className="mt-1 truncate text-sm font-bold">
                  {course.lecturer || "Belum ditentukan"}
                </p>
                <p className="mt-2 text-xs text-[#7d8882]">
                  Ruang {course.room || "belum ditentukan"}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-extrabold">
                    {course._count?.schedules ?? 0}
                  </p>
                  <p className="text-[11px] text-[#808b85]">Jadwal</p>
                </div>
                <div>
                  <p className="text-lg font-extrabold">
                    {course._count?.assignments ?? 0}
                  </p>
                  <p className="text-[11px] text-[#808b85]">Tugas</p>
                </div>
                <div>
                  <p className="text-lg font-extrabold">
                    {course._count?.exams ?? 0}
                  </p>
                  <p className="text-[11px] text-[#808b85]">Ujian</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Modal
        open={modalOpen}
        title={editing ? "Edit mata kuliah" : "Tambah mata kuliah"}
        description="Kode mata kuliah harus unik dalam semester yang sama."
        onClose={closeModal}
      >
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <Field
            label="Semester"
            error={form.formState.errors.semesterId?.message}
          >
            <Select {...form.register("semesterId")}>
              <option value="">Pilih semester</option>
              {semestersQuery.data?.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name} · {semester.academicYear}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-5 sm:grid-cols-[0.7fr_1.3fr]">
            <Field label="Kode" error={form.formState.errors.code?.message}>
              <Input placeholder="SI-301" {...form.register("code")} />
            </Field>
            <Field
              label="Nama mata kuliah"
              error={form.formState.errors.name?.message}
            >
              <Input
                placeholder="Analisis dan Perancangan Sistem"
                {...form.register("name")}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              label="Jumlah SKS"
              error={form.formState.errors.credits?.message}
            >
              <Input
                type="number"
                min={1}
                max={12}
                {...form.register("credits", {
                  valueAsNumber: true,
                })}
              />
            </Field>
            <Field label="Ruangan" error={form.formState.errors.room?.message}>
              <Input placeholder="E231" {...form.register("room")} />
            </Field>
            <Field label="Warna" error={form.formState.errors.color?.message}>
              <Input
                type="color"
                className="p-1.5"
                {...form.register("color")}
              />
            </Field>
          </div>

          <Field label="Dosen" error={form.formState.errors.lecturer?.message}>
            <Input
              placeholder="Nama dosen pengampu"
              {...form.register("lecturer")}
            />
          </Field>

          <Field label="Catatan" error={form.formState.errors.notes?.message}>
            <Textarea
              placeholder="Informasi tambahan mengenai mata kuliah"
              {...form.register("notes")}
            />
          </Field>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              Simpan mata kuliah
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
