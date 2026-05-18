"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Button } from './ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { UserNav } from './user-nav';
import { LoadingSpinner } from './loading-spinner';
import { HistoryDropdown } from './history-dropdown';
import { getCurrentUser, logout as apiLogout, type User } from '@/lib/api';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          try {
            const response = await getCurrentUser();
            setUser(response.user);
          } catch (error) {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user");
            router.push('/');
          }
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error loading user:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const handleLogout = () => {
    apiLogout();
    setUser(null);
    router.push('/');
  };

  // No header needed - history and profile will be in dashboard page itself

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <LoadingSpinner message="Loading dashboard..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Main Content */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
