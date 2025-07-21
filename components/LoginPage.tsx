import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { LoginResponse, authenticatedFetchCustom, getAuthBaseUrl, getBaseUrl } from '@/lib/auth';

interface LoginPageProps {
  onLogin: (authData: LoginResponse) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
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
      const baseUrl = getAuthBaseUrl();
      const response = await authenticatedFetchCustom(`${baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      }

      const authData: LoginResponse = await response.json();
      
      // Store the access token in localStorage for future use
      localStorage.setItem('access_token', authData.access_token);
      localStorage.setItem('refresh_token', authData.refresh_token);
      localStorage.setItem('user_id', authData.user_id);
      localStorage.setItem('user_email', authData.email);
      localStorage.setItem('user_type', authData.user_type);
      
      onLogin(authData);
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#075E54] to-[#128C7E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-full p-6 w-20 h-20 mx-auto mb-4 shadow-lg">
            <MessageSquare className="h-8 w-8 text-[#075E54] mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">WhatsApp Manager</h1>
          <p className="text-green-100">İş süreçlerinizi yönetin</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Giriş Yap</CardTitle>
            <CardDescription>
              Hesabınıza giriş yapın ve WhatsApp session'larınızı yönetin
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
                    placeholder="Email adresinizi girin"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-gray-300 focus:border-[#075E54] focus:ring-[#075E54]"
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
                    placeholder="Şifrenizi girin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-gray-300 focus:border-[#075E54] focus:ring-[#075E54]"
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

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 text-[#075E54] focus:ring-[#075E54] border-gray-300 rounded"
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-600">
                    Beni hatırla
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-sm text-[#075E54] hover:text-[#064e44] font-medium"
                >
                  Şifremi unuttum
                </button>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading || !email.trim() || !password.trim()}
                className="w-full h-12 bg-[#075E54] hover:bg-[#064e44] text-white font-medium text-base shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Giriş yapılıyor...</span>
                  </div>
                ) : (
                  'Giriş Yap'
                )}
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">veya</span>
                </div>
              </div>

              {/* Demo Login */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Demo hesap ile giriş yapın:</p>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p className="font-medium text-gray-700">Email: admin2@gmail.com</p>
                  <p className="font-medium text-gray-700">Şifre: AdminTest123!</p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-green-100">
          <p className="text-sm">
            © 2024 WhatsApp Manager. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </div>
  );
} 