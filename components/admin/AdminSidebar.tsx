'use client';

import { cn } from '@/lib/utils';
import { 
  Shield, 
  Building2, 
  Users,
  X,
  LogOut,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  closeSidebar: () => void;
  user?: any;
  onLogout?: () => void;
}

const menuItems = [
  { id: 'companies', label: 'Firmalar', icon: Building2 },
  { id: 'users', label: 'Kullanıcılar', icon: Users },
];

export default function AdminSidebar({ activeTab, setActiveTab, closeSidebar, user, onLogout }: AdminSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-lg">
              <Shield className="h-6 w-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Süper Admin</h1>
              <p className="text-sm text-slate-300">Sistem Yönetimi</p>
            </div>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-md hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                closeSidebar();
              }}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200",
                activeTab === item.id
                  ? "bg-slate-700 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 space-y-3">
        {/* User Info */}
        {user && (
          <div className="flex items-center space-x-3 px-4 py-3 bg-slate-700 rounded-lg">
            <div className="bg-white p-2 rounded-full">
              <User className="h-4 w-4 text-slate-900" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-slate-300">{user.email}</p>
              <p className="text-xs text-slate-400">{user.role}</p>
            </div>
            {onLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-red-300 hover:text-red-200 hover:bg-red-500/20 p-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        
        {/* System Status */}
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="bg-green-100 p-2 rounded-full">
            <div className="h-2 w-2 bg-green-600 rounded-full"></div>
          </div>
          <div>
            <p className="text-sm font-medium">Admin Panel</p>
            <p className="text-xs text-slate-300">Sistem aktif</p>
          </div>
        </div>
      </div>
    </div>
  );
} 