import { Suspense } from "react";
import { AuthProvider } from "@/context/authContext";
import { NotificationProvider } from "@/context/notificationContext";
import DashboardGuard from "@/components/DashboardGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardGuard>
        <Suspense fallback={<div role="status">Loading dashboard…</div>}><NotificationProvider>{children}</NotificationProvider></Suspense>
      </DashboardGuard>
    </AuthProvider>
  );
}