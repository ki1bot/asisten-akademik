"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Course, GpaSummary, Grade } from "@kampushub/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChartNoAxesColumnIncreasing,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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

const schema = z.object({
  courseId: z.string().uuid("Pilih mata kuliah"),
  finalScore: z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  courseId: "",
  finalScore: 0,
};

export default function GradesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Grade | null>(null);
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

  const gradesQuery = useQuery({
    queryKey: ["grades"],
    queryFn: async () => {
      const response = await api.get<Grade[]>("/grades");
      return response.data;
    },
  });

  const gpaQuery = useQuery({
    queryKey: ["grades", "gpa"],
    queryFn: async () => {
      const response = await api.get<GpaSummary>("/grades/gpa");
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (editing) {
        return api.patch(`/grades/${editing.id}`, {
          finalScore: values.finalScore,
        });
      }

      return api.post("/grades", values);
    },
    onSuccess: () => {
      toast.success(editing ? "Nilai diperbarui" : "Nilai ditambahkan");
      queryClient.invalidateQueries({
        queryKey: ["grades"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
      closeModal();
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/grades/${id}`),
    onSuccess: () => {
      toast.success("Nilai dihapus");
      queryClient.invalidateQueries({
        queryKey: ["grades"],
      });
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const openCreate = () => {
    const gradedCourseIds = new Set(
      gradesQuery.data?.map((grade) => grade.courseId),
    );
    const availableCourse = coursesQuery.data?.find(
      (course) => !gradedCourseIds.has(course.id),
    );

    setEditing(null);
    form.reset({
      courseId: availableCourse?.id ?? "",
      finalScore: 0,
    });
    setModalOpen(true);
  };

  const openEdit = (grade: Grade) => {
    setEditing(grade);
    form.reset({
      courseId: grade.courseId,
      finalScore: grade.finalScore ?? 0,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const gradedIds = new Set(
    gradesQuery.data?.map((grade) => grade.courseId) ?? [],
  );
  const availableCourses =
    coursesQuery.data?.filter((course) => !gradedIds.has(course.id)) ?? [];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Performa akademik"
        title="Nilai dan IPK"
        description="Nilai akhir dikonversi menjadi huruf dan bobot sesuai skala yang dikonfigurasi backend."
        action={
          <Button onClick={openCreate} disabled={!availableCourses.length}>
            <Plus />
            Tambah nilai
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-[#173c34] p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#a8c5ba]">
            Indeks prestasi semester
          </p>
          <div className="mt-5 flex items-end gap-4">
            <p className="text-6xl font-extrabold tracking-[-0.07em]">
              {(gpaQuery.data?.gpa ?? 0).toFixed(2)}
            </p>
            <p className="pb-2 text-sm text-[#a8c5ba]">
              {gpaQuery.data?.semesterName ?? "Belum ada semester aktif"}
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-2xl font-extrabold">
                {gpaQuery.data?.totalCredits ?? 0}
              </p>
              <p className="mt-1 text-xs text-[#a8c5ba]">Total SKS dinilai</p>
            </div>
            <div className="rounded-2xl bg-white/8 p-4">
              <p className="text-2xl font-extrabold">
                {gpaQuery.data?.grades.length ?? 0}
              </p>
              <p className="mt-1 text-xs text-[#a8c5ba]">Mata kuliah</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[#7d8982]">
            Rumus
          </p>
          <p className="serif mt-5 text-3xl text-[#2b3a33]">
            IP = Σ(SKS × bobot) ÷ Σ SKS
          </p>
          <p className="mt-5 text-sm leading-7 text-[#717c76]">
            Hasil IP hanya menghitung mata kuliah yang sudah memiliki nilai
            akhir dan bobot.
          </p>
        </Card>
      </section>

      {gradesQuery.isLoading ? <LoadingState /> : null}

      {!gradesQuery.isLoading && !gradesQuery.data?.length ? (
        <EmptyState
          icon={<ChartNoAxesColumnIncreasing />}
          title="Belum ada nilai"
          description="Tambahkan nilai akhir mata kuliah untuk mulai menghitung IP."
          action={
            availableCourses.length ? (
              <Button onClick={openCreate}>
                <Plus />
                Tambah nilai
              </Button>
            ) : null
          }
        />
      ) : null}

      {gradesQuery.data?.length ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#f0f3ed] text-xs uppercase tracking-[0.12em] text-[#748079]">
                <tr>
                  <th className="px-5 py-4">Mata kuliah</th>
                  <th className="px-5 py-4">SKS</th>
                  <th className="px-5 py-4">Nilai akhir</th>
                  <th className="px-5 py-4">Huruf</th>
                  <th className="px-5 py-4">Bobot</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {gradesQuery.data.map((grade) => (
                  <tr key={grade.id} className="border-t border-[#edf0eb]">
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold">{grade.course?.name}</p>
                      <p className="mt-1 text-xs text-[#7b8680]">
                        {grade.course?.code}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {grade.course?.credits}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold">
                      {grade.finalScore?.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="success">{grade.letter}</Badge>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold">
                      {grade.weight?.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(grade)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm("Hapus nilai ini?")) {
                              deleteMutation.mutate(grade.id);
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
        title={editing ? "Edit nilai" : "Tambah nilai"}
        description="Versi ini menerima nilai akhir langsung. Komponen berbobot dapat ditambahkan setelah alur dasar stabil."
        onClose={closeModal}
      >
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <Field label="Mata kuliah">
            <Select disabled={Boolean(editing)} {...form.register("courseId")}>
              <option value="">Pilih mata kuliah</option>
              {(editing ? coursesQuery.data : availableCourses)?.map(
                (course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.name}
                  </option>
                ),
              )}
            </Select>
          </Field>

          <Field label="Nilai akhir">
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              {...form.register("finalScore", {
                valueAsNumber: true,
              })}
            />
          </Field>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              Simpan nilai
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
