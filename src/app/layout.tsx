import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white selection:bg-blue-500/30`}
      >
        <div className="flex h-screen overflow-hidden">
          <Sidebar username={username} />
          <main className="flex-1 overflow-y-auto">
              {children}
          </main>
        </div>
      </body>
    </html>
  );
}
