"use client";

import { ProfileView } from '@/components/profile-view';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getCurrentUser, type User } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
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
            console.error('Error loading user:', error);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleBack = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen w-full flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    router.push('/dashboard');
    return null;
  }

  return (
    <DashboardLayout>
          <ProfileView onBack={handleBack} user={user} />
    </DashboardLayout>
  );
}
