import type { Metadata } from "next";
import { DM_Serif_Display, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const serif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: {
    default: "KampusHub",
    template: "%s | KampusHub",
  },
  description:
    "Platform produktivitas akademik untuk mengelola semester, mata kuliah, jadwal, tugas, ujian, presensi, dan nilai.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id" className={`${manrope.variable} ${serif.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
