import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full resize-y rounded-xl border border-[#d9ded5] bg-white px-3.5 py-3 text-sm text-[#25302b] outline-none transition placeholder:text-[#99a39d] focus:border-[#4d806f] focus:ring-4 focus:ring-[#4d806f]/10",
        className,
      )}
      {...props}
    />
  );
});
