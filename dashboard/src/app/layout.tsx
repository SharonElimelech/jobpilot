import type { Metadata } from "next";
import { Suez_One, Assistant, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Suez_One({ weight: "400", subsets: ["hebrew", "latin"], variable: "--font-display" });
const body = Assistant({ subsets: ["hebrew", "latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ weight: ["400", "600"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "JobPilot — לוח בקרה",
  description: "Autonomous job-hunt agent dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
