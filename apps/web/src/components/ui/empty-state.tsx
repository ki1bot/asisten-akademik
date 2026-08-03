import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#e7efe9] text-[#286553]">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-[#26342e]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#748079]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
