'use client';

import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import CompaniesPage from './CompaniesPage';
import UsersPage from './UsersPage';
import { cn } from '@/lib/utils';

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('companies');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'companies':
        return <CompaniesPage />;
      case 'users':
        return <UsersPage />;
      default:
        return <CompaniesPage />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Fixed */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-80">
          <AdminSidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            closeSidebar={() => setSidebarOpen(false)}
            user={user}
            onLogout={onLogout}
          />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <AdminSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          closeSidebar={() => setSidebarOpen(false)}
          user={user}
          onLogout={onLogout}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Süper Admin Panel</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
} 