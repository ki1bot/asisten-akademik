import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#e7efe9] text-[#286553]">
        {icon}
      </div>

      <h2 className="text-lg font-extrabold tracking-[-0.02em] text-[#26342e]">
        {title}
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-[#748079]">
        {description}
      </p>

      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
