'use client';

import { useState, useEffect } from 'react';
import Dashboard from '@/components/Dashboard';
import LoginPage from '@/components/LoginPage';
import { LoginResponse, clearAuth, getAccessToken, getUserInfo, validateToken } from '@/lib/auth';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on page load
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      const userInfo = getUserInfo();
      
      if (token && userInfo.user_id && userInfo.email) {
        // Validate token with backend
        const isValid = await validateToken();
        
        if (isValid) {
          // Reconstruct user object from localStorage
          const userData: LoginResponse = {
            access_token: token,
            refresh_token: localStorage.getItem('refresh_token') || '',
            token_type: 'bearer',
            user_id: userInfo.user_id,
            email: userInfo.email,
            user_type: userInfo.user_type || 'user'
          };
          
          setUser(userData);
          setIsLoggedIn(true);
        } else {
          // Token is invalid, clear auth data
          clearAuth();
        }
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (authData: LoginResponse) => {
    setUser(authData);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    // Clear localStorage using the utility function
    clearAuth();
    
    setUser(null);
    setIsLoggedIn(false);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#075E54] to-[#128C7E] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}