'use client';

import { cn } from '@/lib/utils';
import { 
  Smartphone, 
  MessageSquare, 
  Users, 
  Settings,
  X,
  LogOut,
  User,
  Send,
  UserCog
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginResponse } from '@/lib/auth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  closeSidebar: () => void;
  user?: LoginResponse | null;
  onLogout?: () => void;
}

const menuItems = [
  { id: 'sessions', label: 'Numara Yönetimi', icon: Smartphone },
  { id: 'conversations', label: 'Mesajlar', icon: MessageSquare },
  { id: 'bulk-message', label: 'Toplu Mesaj', icon: Send },
  { id: 'contacts', label: 'Kişiler', icon: Users },
  { id: 'employees', label: 'Çalışanlar', icon: UserCog, adminOnly: true },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, closeSidebar, user, onLogout }: SidebarProps) {
  const isAdmin = user?.user_type === 'admin';

  return (
    <div className="flex flex-col h-full bg-[#075E54] text-white">
      {/* Header */}
      <div className="p-6 border-b border-[#064e44]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-lg">
              <MessageSquare className="h-6 w-6 text-[#075E54]" />
            </div>
            <div>
              <h1 className="text-xl font-bold">WhatsApp</h1>
              <p className="text-sm text-green-100">Marketing Dashboard</p>
            </div>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-md hover:bg-[#064e44] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          // Admin-only menü öğelerini kontrol et
          if (item.adminOnly && !isAdmin) {
            return null;
          }

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
                  ? "bg-[#064e44] text-white shadow-lg"
                  : "text-green-100 hover:bg-[#064e44] hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#064e44] space-y-3">
        {/* User Info */}
        {user && (
          <div className="flex items-center space-x-3 px-4 py-3 bg-[#064e44] rounded-lg">
            <div className="bg-white p-2 rounded-full">
              <User className="h-4 w-4 text-[#075E54]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{user.email}</p>
              <p className="text-xs text-green-100">{user.user_type} - Aktif Oturum</p>
            </div>
            {onLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-red-200 hover:text-red-100 hover:bg-red-500/20 p-2"
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
            <p className="text-sm font-medium">System Status</p>
            <p className="text-xs text-green-100">All systems operational</p>
          </div>
        </div>
      </div>
    </div>
  );
}