'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, getUserInfo, validateToken } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      const userInfo = getUserInfo();
      if (token && userInfo.user_id && userInfo.email) {
        const valid = await validateToken();
        if (valid) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.replace('/login');
        }
      } else {
        setIsAuthenticated(false);
        router.replace('/login');
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Yükleniyor...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
} 