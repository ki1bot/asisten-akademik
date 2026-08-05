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
    <header className="grid gap-5 border-b border-[#dde3db] pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:pb-7">
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#4a7b6b] sm:text-xs">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.045em] text-[#1c2c26] sm:text-4xl lg:text-[2.65rem]">
          {title}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#68736d] sm:text-base">
          {description}
        </p>
      </div>

      {action ? (
        <div className="w-full sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
          {action}
        </div>
      ) : null}
    </header>
  );
}
