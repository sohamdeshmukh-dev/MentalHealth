import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import FloatingChat from "@/components/FloatingChat";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MentalMap - Your Mental Wellness Companion",
  description:
    "Interactive mood tracking, journaling, and mental health support with 3D emotional skyline visualization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased bg-[#050913] text-slate-100 font-[family-name:var(--font-inter)]`}
      >
        <Navbar />
        <main>
          {children}
        </main>
        <FloatingChat />
      </body>
    </html>
  );
}
