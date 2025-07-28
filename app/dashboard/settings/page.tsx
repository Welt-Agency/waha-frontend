'use client';

import { useEffect, useState } from 'react';
import { getUserInfo } from '@/lib/auth';
import Settings from '@/components/Settings';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userInfo = getUserInfo();
    setUser({
      user_id: userInfo.user_id,
      email: userInfo.email,
      user_type: userInfo.user_type,
    });
  }, []);

  const handleLogout = () => {
    // Logout işlemi Dashboard layout'ta yapılıyor
    window.location.href = '/login';
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return <Settings user={user} onLogout={handleLogout} />;
} 