"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, disabled, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    const toggleLabel = visible ? "Sembunyikan password" : "Tampilkan password";

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pr-12", className)}
          {...props}
        />

        <button
          type="button"
          disabled={disabled}
          aria-label={toggleLabel}
          aria-pressed={visible}
          title={toggleLabel}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-[#718079] transition-colors hover:text-[#173c34] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#3f7b67]/15 disabled:pointer-events-none disabled:opacity-40"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOff className="size-[18px]" aria-hidden="true" />
          ) : (
            <Eye className="size-[18px]" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
