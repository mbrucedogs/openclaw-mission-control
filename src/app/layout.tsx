import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { ensureSeeded } from "@/lib/openclaw/ingestion";

// Auto-populate DB with real workspace data on first boot
ensureSeeded();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mission Control",
  description: "Advanced Agent Orchestration Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const username = process.env.AUTH_USER || 'Admin';

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white selection:bg-blue-500/30 font-sans`}
      >
        <LayoutWrapper username={username}>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
