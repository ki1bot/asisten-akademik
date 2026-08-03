"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Assignment, Course } from "@kampushub/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheckBig, ListTodo, Pencil, Plus, Trash2 } from "lucide-react";
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
  assignmentStatusLabels,
  formatDateTime,
  priorityLabels,
  toDateTimeInput,
} from "@/lib/format";

const schema = z.object({
  courseId: z.string().uuid("Pilih mata kuliah"),
  title: z.string().min(2).max(160),
  description: z.string().max(5000).optional(),
  deadline: z.string().min(1, "Deadline wajib diisi"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum(["TODO", "IN_PROGRESS", "SUBMITTED", "COMPLETED", "OVERDUE"]),
  reminderAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  courseId: "",
  title: "",
  description: "",
  deadline: "",
  priority: "MEDIUM",
  status: "TODO",
  reminderAt: "",
};

function statusVariant(status: Assignment["status"]) {
  if (status === "COMPLETED" || status === "SUBMITTED") {
    return "success" as const;
  }

  if (status === "OVERDUE") {
    return "danger" as const;
  }

  if (status === "IN_PROGRESS") {
    return "info" as const;
  }

  return "neutral" as const;
}

export default function AssignmentsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

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

  const assignmentsQuery = useQuery({
    queryKey: ["assignments", statusFilter],
    queryFn: async () => {
      const response = await api.get<Assignment[]>("/assignments", {
        params: statusFilter
          ? {
              status: statusFilter,
            }
          : undefined,
      });

      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        deadline: new Date(values.deadline).toISOString(),
        description: values.description || null,
        reminderAt: values.reminderAt
          ? new Date(values.reminderAt).toISOString()
          : null,
      };

      if (editing) {
        return api.patch(`/assignments/${editing.id}`, payload);
      }

      return api.post("/assignments", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Tugas diperbarui" : "Tugas ditambahkan");
      queryClient.invalidateQueries({
        queryKey: ["assignments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
      closeModal();
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/assignments/${id}`),
    onSuccess: () => {
      toast.success("Tugas dihapus");
      queryClient.invalidateQueries({
        queryKey: ["assignments"],
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

  const openEdit = (assignment: Assignment) => {
    setEditing(assignment);
    form.reset({
      courseId: assignment.courseId,
      title: assignment.title,
      description: assignment.description ?? "",
      deadline: toDateTimeInput(assignment.deadline),
      priority: assignment.priority,
      status: assignment.status,
      reminderAt: toDateTimeInput(assignment.reminderAt),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const markCompleted = async (assignment: Assignment) => {
    try {
      await api.patch(`/assignments/${assignment.id}`, {
        status: "COMPLETED",
      });

      toast.success("Tugas ditandai selesai");
      queryClient.invalidateQueries({
        queryKey: ["assignments"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    } catch (error) {
      toast.error(getRequestError(error));
    }
  };

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Deadline dan progres"
        title="Tugas"
        description="Pantau status pengerjaan berdasarkan mata kuliah, prioritas, dan tenggat."
        action={
          <Button onClick={openCreate} disabled={!coursesQuery.data?.length}>
            <Plus />
            Tambah tugas
          </Button>
        }
      />

      <div className="max-w-sm">
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">Semua status</option>
          {Object.entries(assignmentStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {assignmentsQuery.isLoading ? <LoadingState /> : null}

      {!assignmentsQuery.isLoading && !assignmentsQuery.data?.length ? (
        <EmptyState
          icon={<ListTodo />}
          title="Belum ada tugas"
          description="Catat tugas sejak diberikan agar deadline tidak tercecer."
          action={
            coursesQuery.data?.length ? (
              <Button onClick={openCreate}>
                <Plus />
                Tambah tugas
              </Button>
            ) : null
          }
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {assignmentsQuery.data?.map((assignment) => (
          <Card key={assignment.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={statusVariant(assignment.status)}>
                    {assignmentStatusLabels[assignment.status]}
                  </Badge>
                  <Badge>{priorityLabels[assignment.priority]}</Badge>
                </div>
                <h2 className="mt-4 text-xl font-extrabold tracking-[-0.03em]">
                  {assignment.title}
                </h2>
                <p className="mt-2 text-sm font-semibold text-[#647069]">
                  {assignment.course?.name}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(assignment)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (window.confirm("Hapus tugas ini?")) {
                      deleteMutation.mutate(assignment.id);
                    }
                  }}
                >
                  <Trash2 className="text-[#a84c43]" />
                </Button>
              </div>
            </div>

            {assignment.description ? (
              <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#78837d]">
                {assignment.description}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-[#f2f3ef] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-[#7d8882]">Deadline</p>
                <p className="mt-1 text-sm font-extrabold">
                  {formatDateTime(assignment.deadline)}
                </p>
              </div>
              {!["COMPLETED", "SUBMITTED"].includes(assignment.status) ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => markCompleted(assignment)}
                >
                  <CircleCheckBig />
                  Tandai selesai
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </section>

      <Modal
        open={modalOpen}
        title={editing ? "Edit tugas" : "Tambah tugas"}
        onClose={closeModal}
      >
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
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

          <Field
            label="Judul tugas"
            error={form.formState.errors.title?.message}
          >
            <Input
              placeholder="Laporan analisis proses bisnis"
              {...form.register("title")}
            />
          </Field>

          <Field label="Deskripsi">
            <Textarea
              placeholder="Ketentuan, ruang lingkup, atau catatan pengerjaan"
              {...form.register("description")}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Deadline"
              error={form.formState.errors.deadline?.message}
            >
              <Input type="datetime-local" {...form.register("deadline")} />
            </Field>
            <Field label="Pengingat">
              <Input type="datetime-local" {...form.register("reminderAt")} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Prioritas">
              <Select {...form.register("priority")}>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select {...form.register("status")}>
                {Object.entries(assignmentStatusLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              Simpan tugas
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
