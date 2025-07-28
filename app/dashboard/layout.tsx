'use client';
import { useState, useEffect } from 'react';
import Dashboard from '@/components/Dashboard';
import { getUserInfo, clearAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { LoginResponse } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userInfo = getUserInfo();
    if (!userInfo.user_id || !userInfo.email) {
      router.replace('/login');
      return;
    }
    setUser({
      access_token: localStorage.getItem('access_token') || '',
      refresh_token: localStorage.getItem('refresh_token') || '',
      token_type: 'bearer',
      user_id: userInfo.user_id,
      email: userInfo.email,
      user_type: userInfo.user_type || 'user',
    });
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#075E54] to-[#128C7E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <Dashboard user={user} onLogout={handleLogout}>
      {children}
    </Dashboard>
  );
} 