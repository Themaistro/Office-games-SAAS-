import GlobalRealtimeSync from "@/components/GlobalRealtimeSync";
import { SentInvitationsProvider } from "@/components/providers/SentInvitationsProvider";
import ContactsPanel from "@/components/messaging/ContactsPanel";
import AppearanceProvider from "@/components/providers/AppearanceProvider";
import { PresenceProvider } from "@/components/providers/PresenceProvider";
import ToastProvider from "@/components/ui/ToastProvider";
import { APPEARANCE_COOKIE, resolveAppearance } from "@/lib/appearance";
import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/features/identity/public-server";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const admin = user ? await getCurrentAdmin() : null;
  const theme = resolveAppearance(
    (await cookies()).get(APPEARANCE_COOKIE)?.value,
  );
  return (
    <html
      lang="en"
      data-office-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-16 md:pb-0">
        <AppearanceProvider initialTheme={theme}>
          <PresenceProvider enabled={Boolean(user && !admin)}>
            <SentInvitationsProvider
              key={user && !admin ? user.id : "guest"}
              userId={user && !admin ? user.id : undefined}
            >
              <GlobalRealtimeSync
                userId={user && !admin ? user.id : undefined}
              />
              <ToastProvider>
                {user && !admin && <ContactsPanel userId={user.id} />}
                {children}
              </ToastProvider>
            </SentInvitationsProvider>
          </PresenceProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
