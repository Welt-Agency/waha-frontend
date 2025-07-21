import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Mail, Eye, EyeOff } from 'lucide-react';

interface AdminLoginPageProps {
  onLogin: (adminData: any) => void;
}

export default function AdminLoginPage({ onLogin }: AdminLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError('Lütfen email ve şifre alanlarını doldurun');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Demo admin credentials - gerçek uygulamada API çağrısı yapılacak
      if (email === 'superadmin@system.com' && password === 'SuperAdmin123!') {
        const adminData = {
          token: 'demo-admin-token-' + Date.now(),
          email: email,
          name: 'Süper Admin',
          role: 'super_admin',
          permissions: ['manage_companies', 'manage_users', 'view_all']
        };
        
        onLogin(adminData);
      } else {
        throw new Error('Geçersiz email veya şifre');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setError(error instanceof Error ? error.message : 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-full p-6 w-20 h-20 mx-auto mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-slate-900 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Süper Admin Paneli</h1>
          <p className="text-slate-300">Sistem yönetimi ve firma kontrolü</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Admin Girişi</CardTitle>
            <CardDescription>
              Sistem yöneticisi olarak giriş yapın
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Admin email adresinizi girin"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Şifre
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Admin şifrenizi girin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading || !email.trim() || !password.trim()}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium text-base shadow-lg transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Giriş yapılıyor...</span>
                  </div>
                ) : (
                  'Admin Girişi'
                )}
              </Button>

              {/* Demo Credentials */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Demo hesap bilgileri:</p>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p className="font-medium text-gray-700">Email: superadmin@system.com</p>
                  <p className="font-medium text-gray-700">Şifre: SuperAdmin123!</p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-300">
          <p className="text-sm">
            © 2024 WhatsApp Manager - Süper Admin Paneli
          </p>
        </div>
      </div>
    </div>
  );
} 