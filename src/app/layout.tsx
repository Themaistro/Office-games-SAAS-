import type { Metadata } from "next";
import { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalRealtimeSync from "@/components/GlobalRealtimeSync";
import { PresenceProvider } from "@/components/providers/PresenceProvider";
import { getCurrentUser } from "@/lib/auth";
import ContactsPanel from "@/components/messaging/ContactsPanel";
import ToastProvider from "@/components/ui/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Office Games",
  description: "A healthy daily break for teams to play, connect, and compete.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-16 md:pb-0">
        <PresenceProvider>
          <GlobalRealtimeSync />
          <ToastProvider>{user && <ContactsPanel userId={user.id} />}{children}</ToastProvider>
        </PresenceProvider>
      </body>
    </html>
  );
}

