'use client';
import SessionManager from '@/components/SessionManager';
import { getUserInfo, clearAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoginResponse } from '@/lib/auth';

export default function SessionsPage() {
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

  if (loading) return null;
  if (!user) return null;

  return <SessionManager />;
} 