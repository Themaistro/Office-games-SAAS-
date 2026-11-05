import { getCurrentUser } from "@/features/identity/public-server";
import NotificationBellClient from "@/components/layout/NotificationBellClient";

export default async function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <>
      {user && <NotificationBellClient userId={user.id} showBell={false} />}
      {children}
    </>
  );
}
