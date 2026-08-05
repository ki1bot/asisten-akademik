import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3f7b67]/20 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#173c34] text-white shadow-[0_10px_24px_rgba(23,60,52,0.18)] hover:-translate-y-0.5 hover:bg-[#0f3029] hover:shadow-[0_14px_30px_rgba(23,60,52,0.22)]",
        secondary: "bg-[#e5eee8] text-[#173c34] hover:bg-[#d8e6dd]",
        outline:
          "border border-[#d9ded5] bg-white text-[#27332e] shadow-sm hover:border-[#aeb9b0] hover:bg-[#f8f9f6]",
        ghost: "text-[#53615a] hover:bg-[#edf1eb] hover:text-[#173c34]",
        destructive:
          "bg-[#a83e36] text-white shadow-[0_8px_20px_rgba(168,62,54,0.16)] hover:bg-[#8f302a]",
        link: "h-auto rounded-none p-0 text-[#176b59] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-10 rounded-xl px-3.5 text-sm",
        default: "h-11 px-5 text-sm",
        lg: "h-12 rounded-2xl px-6 text-base",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
