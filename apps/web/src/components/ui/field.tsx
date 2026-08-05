import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, htmlFor, children }: FieldProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-sm font-semibold text-[#39443f]"
        >
          {label}
        </label>

        {hint ? (
          <span className="text-xs font-medium text-[#7b8780]">{hint}</span>
        ) : null}
      </div>

      {children}

      {error ? (
        <p role="alert" className="text-xs font-semibold text-[#a84c43]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
