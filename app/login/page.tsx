'use client';

import LoginPage from '@/components/LoginPage';
import { useRouter } from 'next/navigation';
import { LoginResponse } from '@/lib/auth';

export default function Login() {
  const router = useRouter();

  const handleLogin = (authData: LoginResponse) => {
    if (authData.user_type === 'dev') {
      router.push('/admin');
    } else {
        router.push('/dashboard');
    }
  };

  return <LoginPage onLogin={handleLogin} />;
} 