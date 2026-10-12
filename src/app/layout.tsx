import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSchoolSettings } from "@/lib/settings";
import { ThemeStyle } from "@/components/theme-style";
import { ToastProvider } from "@/components/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const school = await getSchoolSettings();
  return {
    title: {
      default: school.shortName,
      template: `%s | ${school.shortName}`,
    },
    description: `${school.shortName} · ${school.name}. Desde Inicial hasta Academia, con gestión y portal de familias.`,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const school = await getSchoolSettings();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeStyle school={school} />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}