"use client";

import type { Notification } from "@kampushub/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, getRequestError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get<Notification[]>("/notifications");
      return response.data;
    },
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.patch("/notifications/read-all"),
    onSuccess: () => {
      toast.success("Semua notifikasi ditandai dibaca");
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
    onError: (error) => toast.error(getRequestError(error)),
  });

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Pusat pengingat"
        title="Notifikasi"
        description="Pengingat tugas, ujian, jadwal, dan informasi sistem ditampilkan di sini."
        action={
          <Button
            variant="outline"
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending}
          >
            <CheckCheck />
            Tandai semua dibaca
          </Button>
        }
      />

      {query.isLoading ? <LoadingState /> : null}

      {!query.isLoading && !query.data?.length ? (
        <EmptyState
          icon={<Bell />}
          title="Tidak ada notifikasi"
          description="Pengingat dan informasi sistem akan muncul di halaman ini."
        />
      ) : null}

      <section className="grid gap-3">
        {query.data?.map((notification) => (
          <Card
            key={notification.id}
            className={`p-5 ${
              notification.readAt ? "bg-white" : "border-[#b9d0c5] bg-[#f4faf6]"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`mt-1 size-2 shrink-0 rounded-full ${
                  notification.readAt ? "bg-[#c8ceca]" : "bg-[#3c8068]"
                }`}
              />
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  if (!notification.readAt) {
                    readMutation.mutate(notification.id);
                  }
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-extrabold text-[#28372f]">
                    {notification.title}
                  </h2>
                  {!notification.readAt ? (
                    <Badge variant="success">Baru</Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-[#6f7a74]">
                  {notification.message}
                </p>
                <p className="mt-3 text-xs font-semibold text-[#909994]">
                  {formatDateTime(notification.createdAt)}
                </p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(notification.id)}
              >
                <Trash2 className="text-[#a84c43]" />
              </Button>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
