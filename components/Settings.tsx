'use client';

import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoginResponse } from '@/lib/auth';

interface SettingsProps {
  user: LoginResponse | null;
  onLogout: () => void;
}

export default function Settings({ user, onLogout }: SettingsProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Hesap bilgilerinizi görüntüleyin ve yönetin</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>Hoş geldin, {user?.email}</span>
              </div>
              
              {/* Logout Button */}
              <Button 
                variant="outline" 
                onClick={onLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>

        {/* User Account Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-[#075E54]" />
              <CardTitle>Kullanıcı Hesabı</CardTitle>
            </div>
            <CardDescription>
              Hesap bilgilerinizi görüntüleyin ve yönetin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="current-email">Email</Label>
                <Input 
                  id="current-email"
                  value={user?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="user-type">Kullanıcı Tipi</Label>
                <Input 
                  id="user-type"
                  value={user?.user_type || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">Aktif Oturum</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onLogout}
                className="text-red-600 hover:text-red-700"
              >
                Oturumu Kapat
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}