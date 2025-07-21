'use client';

import { useState, useEffect } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminLoginPage from '@/components/admin/AdminLoginPage';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing admin authentication on page load
  useEffect(() => {
    const checkAdminAuth = () => {
      const adminToken = localStorage.getItem('admin_token');
      const adminData = localStorage.getItem('admin_user');
      
      if (adminToken && adminData) {
        try {
          const userData = JSON.parse(adminData);
          setAdminUser(userData);
          setIsLoggedIn(true);
        } catch (error) {
          // Invalid data, clear it
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
        }
      }
      
      setIsLoading(false);
    };

    checkAdminAuth();
  }, []);

  const handleAdminLogin = (adminData: any) => {
    setAdminUser(adminData);
    setIsLoggedIn(true);
    localStorage.setItem('admin_token', adminData.token);
    localStorage.setItem('admin_user', JSON.stringify(adminData));
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
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