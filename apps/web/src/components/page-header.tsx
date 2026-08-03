import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#4a7b6b]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-bold tracking-[-0.04em] text-[#1c2c26] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[#68736d] sm:text-base">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}
