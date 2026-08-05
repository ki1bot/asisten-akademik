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
        "min-h-11 w-full rounded-xl border border-[#d5ddd6] bg-white px-3.5 py-2.5 text-sm font-medium text-[#25322c] shadow-[0_1px_2px_rgba(23,60,52,0.03)] outline-none transition-[border-color,background-color,box-shadow] placeholder:font-normal placeholder:text-[#929d97] hover:border-[#bdc9c0] focus:border-[#3f7b67] focus:bg-white focus:ring-4 focus:ring-[#3f7b67]/10 disabled:cursor-not-allowed disabled:border-[#e0e5e0] disabled:bg-[#eef1ed] disabled:text-[#89938d]",
        className,
      )}
      {...props}
    />
  );
});
