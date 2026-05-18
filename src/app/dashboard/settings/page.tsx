"use client";

import { SettingsView } from '@/components/settings-view';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { logout as apiLogout } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/dashboard');
  };

  const handleLogout = () => {
    apiLogout();
    router.push('/');
  };

  return (
    <DashboardLayout>
          <SettingsView onBack={handleBack} onLogout={handleLogout} />
    </DashboardLayout>
  );
}
