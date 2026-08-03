"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Semester } from "@kampushub/contracts";
import { semesterSchema, type SemesterInput } from "@kampushub/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { formatDate, semesterTypeLabels, toDateInput } from "@/lib/format";

interface SemesterWithCount extends Semester {
  _count?: {
    courses: number;
  };
}

const emptyValues: SemesterInput = {
  name: "",
  academicYear: "",
  type: "ODD",
  startDate: "",
  endDate: "",
  isActive: false,
};

export default function SemestersPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SemesterWithCount | null>(null);

  const form = useForm<SemesterInput>({
    resolver: zodResolver(semesterSchema),
    defaultValues: emptyValues,
  });

  const query = useQuery({
    queryKey: ["semesters"],
    queryFn: async () => {
      const response = await api.get<SemesterWithCount[]>("/semesters");
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: SemesterInput) => {
      const payload = {
        ...values,
        startDate: new Date(`${values.startDate}T00:00:00`).toISOString(),
        endDate: new Date(`${values.endDate}T23:59:59`).toISOString(),
      };

      if (editing) {
        return api.patch(`/semesters/${editing.id}`, payload);
      }

      return api.post("/semesters", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Semester diperbarui" : "Semester ditambahkan");
      queryClient.invalidateQueries({
        queryKey: ["semesters"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
      closeModal();
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/semesters/${id}`),
    onSuccess: () => {
      toast.success("Semester dihapus");
      queryClient.invalidateQueries({
        queryKey: ["semesters"],
      });
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const openCreate = () => {
    setEditing(null);
    form.reset(emptyValues);
    setModalOpen(true);
  };

  const openEdit = (semester: SemesterWithCount) => {
    setEditing(semester);
    form.reset({
      name: semester.name,
      academicYear: semester.academicYear,
      type: semester.type,
      startDate: toDateInput(semester.startDate),
      endDate: toDateInput(semester.endDate),
      isActive: semester.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.reset(emptyValues);
  };

  const remove = (semester: SemesterWithCount) => {
    const approved = window.confirm(
      `Hapus ${semester.name}? Semua mata kuliah dan data turunannya ikut terhapus.`,
    );

    if (approved) {
      deleteMutation.mutate(semester.id);
    }
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Struktur akademik"
        title="Semester"
        description="Semester menjadi induk mata kuliah, jadwal, tugas, ujian, presensi, dan nilai."
        action={
          <Button onClick={openCreate}>
            <Plus />
            Tambah semester
          </Button>
        }
      />

      {query.isLoading ? <LoadingState /> : null}

      {!query.isLoading && !query.data?.length ? (
        <EmptyState
          icon={<CalendarRange />}
          title="Belum ada semester"
          description="Buat semester aktif terlebih dahulu sebelum menambahkan mata kuliah."
          action={
            <Button onClick={openCreate}>
              <Plus />
              Buat semester pertama
            </Button>
          }
        />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {query.data?.map((semester) => (
          <Card key={semester.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold tracking-[-0.03em]">
                    {semester.name}
                  </h2>
                  {semester.isActive ? (
                    <Badge variant="success">Aktif</Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-semibold text-[#6e7973]">
                  {semester.academicYear} · {semesterTypeLabels[semester.type]}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(semester)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(semester)}
                >
                  <Trash2 className="text-[#a84c43]" />
                </Button>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#f1f3ee] p-4">
                <p className="text-xs font-semibold text-[#7b8680]">Periode</p>
                <p className="mt-2 text-sm font-bold">
                  {formatDate(semester.startDate)}
                </p>
                <p className="text-xs text-[#7b8680]">
                  hingga {formatDate(semester.endDate)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#e5eee8] p-4">
                <p className="text-xs font-semibold text-[#567065]">
                  Mata kuliah
                </p>
                <p className="mt-2 text-3xl font-extrabold text-[#285d4c]">
                  {semester._count?.courses ?? 0}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Modal
        open={modalOpen}
        title={editing ? "Edit semester" : "Tambah semester"}
        description="Pastikan hanya satu semester yang berstatus aktif."
        onClose={closeModal}
      >
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Nama semester"
              error={form.formState.errors.name?.message}
            >
              <Input placeholder="Semester 5" {...form.register("name")} />
            </Field>

            <Field
              label="Tahun akademik"
              error={form.formState.errors.academicYear?.message}
            >
              <Input
                placeholder="2026/2027"
                {...form.register("academicYear")}
              />
            </Field>
          </div>

          <Field
            label="Jenis semester"
            error={form.formState.errors.type?.message}
          >
            <Select {...form.register("type")}>
              <option value="ODD">Ganjil</option>
              <option value="EVEN">Genap</option>
            </Select>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Tanggal mulai"
              error={form.formState.errors.startDate?.message}
            >
              <Input type="date" {...form.register("startDate")} />
            </Field>

            <Field
              label="Tanggal selesai"
              error={form.formState.errors.endDate?.message}
            >
              <Input type="date" {...form.register("endDate")} />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-2xl bg-[#eef2ec] p-4 text-sm font-semibold text-[#33423b]">
            <input
              type="checkbox"
              className="size-4 accent-[#286553]"
              {...form.register("isActive")}
            />
            Jadikan semester aktif
          </label>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              Simpan semester
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
