"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#14221d]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Tutup modal"
        className="absolute inset-0"
        onClick={onClose}
      />
      <section className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-white/40 bg-[#fbfcf9] shadow-2xl sm:max-w-2xl sm:rounded-[28px]">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e5e8e1] bg-[#fbfcf9]/95 px-5 py-5 backdrop-blur sm:px-7">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#1e2d27]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-[#68736d]">
                {description}
              </p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tutup"
            onClick={onClose}
          >
            <X />
          </Button>
        </header>
        <div className="p-5 sm:p-7">{children}</div>
      </section>
    </div>
  );
}
