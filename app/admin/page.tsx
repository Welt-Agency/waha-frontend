'use client';

import { useState, useEffect } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminLoginPage from '@/components/admin/AdminLoginPage';
import { LoginResponse, getAccessToken, getUserInfo } from '@/lib/auth';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState<LoginResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing admin authentication on page load
  useEffect(() => {
    const checkAdminAuth = () => {
      const accessToken = getAccessToken();
      const userInfo = getUserInfo();
      
      if (accessToken && userInfo.user_type === 'admin') {
        // Reconstruct LoginResponse from localStorage data
        const adminData: LoginResponse = {
          access_token: accessToken,
          refresh_token: localStorage.getItem('refresh_token') || '',
          token_type: 'bearer',
          user_id: userInfo.user_id || '',
          email: userInfo.email || '',
          user_type: userInfo.user_type || ''
        };
        
        setAdminUser(adminData);
        setIsLoggedIn(true);
      }
      
      setIsLoading(false);
    };

    checkAdminAuth();
  }, []);

  const handleAdminLogin = (adminData: LoginResponse) => {
    setAdminUser(adminData);
    setIsLoggedIn(true);
  };

  const handleAdminLogout = () => {
    // Clear all auth data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_type');
    
    setAdminUser(null);
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
    return <AdminLoginPage onLogin={handleAdminLogin} />;
  }

  return <AdminDashboard user={adminUser} onLogout={handleAdminLogout} />;
} 