import type { ReactNode } from "react";

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-[#39443f]">{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-medium text-[#a83e36]">{error}</span>
      ) : null}
    </label>
  );
}
