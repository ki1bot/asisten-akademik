import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-[#d9ded5] bg-white px-3.5 text-sm text-[#25302b] outline-none transition placeholder:text-[#99a39d] focus:border-[#4d806f] focus:ring-4 focus:ring-[#4d806f]/10 disabled:cursor-not-allowed disabled:bg-[#f0f2ee]",
        className,
      )}
      {...props}
    />
  );
});
