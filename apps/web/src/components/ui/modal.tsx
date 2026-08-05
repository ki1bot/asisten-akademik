"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
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
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#14221d]/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Tutup modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="relative z-10 max-h-[94dvh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] border border-white/70 bg-[#fbfcf9] shadow-[0_30px_90px_rgba(14,35,28,0.3)] outline-none sm:max-w-2xl sm:rounded-[28px]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e5e8e1] bg-[#fbfcf9]/95 px-5 py-5 backdrop-blur-xl sm:px-7">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-xl font-extrabold tracking-[-0.025em] text-[#1e2d27] sm:text-2xl"
            >
              {title}
            </h2>

            {description ? (
              <p
                id={descriptionId}
                className="mt-1.5 text-sm leading-6 text-[#68736d]"
              >
                {description}
              </p>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Tutup"
            onClick={onClose}
          >
            <X />
          </Button>
        </header>

        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7 [&_form>div:last-child]:flex-wrap sm:[&_form>div:last-child]:flex-nowrap">
          {children}
        </div>
      </section>
    </div>
  );
}
