import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { getSchoolSettings } from "@/lib/settings";
import { ThemeStyle } from "@/components/theme-style";
import { ToastProvider } from "@/components/toast";

const fontSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
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
      className={`${fontSans.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeStyle school={school} />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}