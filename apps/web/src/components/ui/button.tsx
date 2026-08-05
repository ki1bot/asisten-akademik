import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-w-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3f7b67]/20 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-[#173c34] bg-[#173c34] text-white shadow-[0_10px_24px_rgba(23,60,52,0.18)] hover:border-[#0d2d26] hover:bg-[#0d2d26] hover:shadow-[0_14px_30px_rgba(23,60,52,0.22)]",
        secondary:
          "border border-[#d4e3d9] bg-[#e3eee7] text-[#173c34] hover:border-[#c4d8cb] hover:bg-[#d7e7dc]",
        outline:
          "border border-[#d2dbd3] bg-white text-[#25332d] shadow-sm hover:border-[#9fb0a4] hover:bg-[#f7f9f6]",
        ghost:
          "border border-transparent bg-transparent text-[#53615a] hover:bg-[#e9efea] hover:text-[#173c34]",
        destructive:
          "border border-[#a84c43] bg-[#a84c43] text-white shadow-[0_8px_20px_rgba(168,76,67,0.18)] hover:border-[#8e3c35] hover:bg-[#8e3c35]",
        link: "h-auto rounded-none border-0 bg-transparent p-0 text-[#176b59] shadow-none underline-offset-4 hover:underline",
      },
      size: {
        sm: "min-h-10 rounded-xl px-3.5 py-2 text-sm",
        default: "min-h-11 px-5 py-2.5 text-sm",
        lg: "min-h-12 rounded-2xl px-6 py-3 text-base",
        icon: "size-11 shrink-0 p-0",
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
