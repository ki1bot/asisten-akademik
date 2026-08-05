import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="grid gap-5 border-b border-[#dce3dc] pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-8 sm:pb-8">
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? (
          <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#3f725f] sm:text-[11px]">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="max-w-4xl text-[2rem] font-black leading-[1.1] tracking-[-0.05em] text-[#1b2b25] sm:text-[2.55rem] lg:text-[2.85rem]">
          {title}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68756e] sm:mt-4 sm:text-base sm:leading-7">
          {description}
        </p>
      </div>

      {action ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-max sm:flex-row sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
          {action}
        </div>
      ) : null}
    </header>
  );
}
