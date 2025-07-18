'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, Search, Plus, Mail, Trash2, Edit, UserCheck, UserX, Smartphone, Activity, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { authenticatedFetch } from '@/lib/auth';

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [company, setCompany] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSessionCount, setActiveSessionCount] = useState<number>(0);
  const [createdUser, setCreatedUser] = useState<{email: string, password: string} | null>(null);
  const csvDownloadRef = useRef<HTMLAnchorElement>(null);

  // fetchData fonksiyonunu useEffect dışına çıkar
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [meRes, usersRes, sessionsRes] = await Promise.all([
        authenticatedFetch('/company/me'),
        authenticatedFetch('/company/users'),
        authenticatedFetch('/sessions')
      ]);
      if (!meRes.ok) throw new Error('Şirket bilgisi alınamadı');
      if (!usersRes.ok) throw new Error('Kullanıcı listesi alınamadı');
      if (!sessionsRes.ok) throw new Error('Session bilgisi alınamadı');
      const meData = await meRes.json();
      const usersData = await usersRes.json();
      const sessionsData = await sessionsRes.json();
      setCompany(meData);
      setUsers(usersData);
      setActiveSessionCount(Array.isArray(sessionsData) ? sessionsData.length : 0);
      const myUser = usersData.find((u: any) => u.role === 'admin');
      setIsAdmin(!!myUser);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-gray-600">Yükleniyor...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-red-600">{error}</span>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-orange-600 font-semibold">Bu sayfaya erişim yetkiniz yok.</span>
      </div>
    );
  }

  const getInitials = (name: string | undefined | null) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getDisplayName = (employee: any) => {
    const first = employee.profile?.first_name;
    const last = employee.profile?.last_name;
    if (first || last) return [first, last].filter(Boolean).join(' ');
    return employee.profile?.email || 'Bilinmeyen';
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800">Yönetici</Badge>;
      case 'moderator':
        return <Badge className="bg-blue-100 text-blue-800">Moderatör</Badge>;
      case 'user':
        return <Badge className="bg-gray-100 text-gray-800">Kullanıcı</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Aktif</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Pasif</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Güçlü şifre generate fonksiyonu
  const generatePassword = (length = 12) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=';
    let pass = '';
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // CSV indirme fonksiyonu
  const downloadCSV = (email: string, password: string) => {
    const csv = `email,password\n${email},${password}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    if (csvDownloadRef.current) {
      csvDownloadRef.current.href = url;
      csvDownloadRef.current.download = `user-credentials-${email}.csv`;
      csvDownloadRef.current.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  // Çalışan ekleme fonksiyonunu güncelle
  const handleAddEmployee = async () => {
    // API çağrısı burada yapılacak
    try {
      const res = await authenticatedFetch('/users/create-normal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmployee.email,
          password: newEmployee.password
        })
      });
      if (!res.ok) throw new Error('Kullanıcı oluşturulamadı');
      setCreatedUser({ email: newEmployee.email, password: newEmployee.password });
      setIsAddEmployeeOpen(false);
      setNewEmployee({ name: '', email: '', password: '' });
      setShowPassword(false);
      await fetchData();
    } catch (err) {
      alert('Kullanıcı oluşturulamadı!');
    }
  };

  // handleToggleStatus fonksiyonunu koru
  const handleToggleStatus = (employeeId: string, currentStatus: string) => {
    // API çağrısı burada yapılacak
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    console.log('Çalışan durumu değiştiriliyor:', employeeId, newStatus);
  };

  // handleDeleteEmployee fonksiyonunu koru
  const handleDeleteEmployee = (employeeId: string) => {
    // API çağrısı burada yapılacak
    console.log('Çalışan siliniyor:', employeeId);
  };

  // Filtreleme
  const filteredEmployees = users.filter(employee =>
    getDisplayName(employee).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (employee.profile?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (employee.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Çalışan Yönetimi</h1>
              <p className="text-gray-600">Firma çalışanlarını yönetin ve yetkilendirin</p>
            </div>
            
            {/* Add Employee Button */}
            <Dialog open={isAddEmployeeOpen} onOpenChange={(open) => {
              setIsAddEmployeeOpen(open);
              if (!open) {
                setNewEmployee({ name: '', email: '', password: '' });
                setShowPassword(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-[#075E54] hover:bg-[#064e44]">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Çalışan Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Yeni Çalışan Ekle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ad Soyad</Label>
                    <Input
                      id="name"
                      placeholder="Çalışanın adı soyadı"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@company.com"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Şifre</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Çalışanın şifresi"
                        value={newEmployee.password}
                        onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                        className="pr-10"
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
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAddEmployeeOpen(false);
                        setNewEmployee({ name: '', email: '', password: '' });
                        setShowPassword(false);
                      }}
                    >
                      İptal
                    </Button>
                    <Button 
                      onClick={handleAddEmployee}
                      disabled={!newEmployee.name || !newEmployee.email || !newEmployee.password}
                      className="bg-[#075E54] hover:bg-[#064e44]"
                    >
                      Çalışan Ekle
                    </Button>
                  </div>
                </div>
                {createdUser && (
                  <div className="my-4 flex items-center space-x-2">
                    <Button
                      onClick={() => downloadCSV(createdUser.email, createdUser.password)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Kullanıcı Bilgilerini CSV Olarak İndir
                    </Button>
                    <a ref={csvDownloadRef} style={{ display: 'none' }} />
                    <span className="text-xs text-gray-500">(Bu dosya sadece bir kereye mahsus indirilebilir!)</span>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Çalışanlarda ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-[#075E54] mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                  <p className="text-sm text-gray-600">Toplam Çalışan</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Smartphone className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">15</div>
                  <p className="text-sm text-gray-600">Session Limiti</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{activeSessionCount}</div>
                  <p className="text-sm text-gray-600">Toplam Session</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employees List */}
        <Card>
          <CardHeader>
            <CardTitle>Çalışan Listesi</CardTitle>
            <CardDescription>
              Tüm firma çalışanlarının listesi ve yönetim seçenekleri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={employee.avatar || undefined} />
                    <AvatarFallback className="bg-[#075E54] text-white">
                      {getInitials(getDisplayName(employee))}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900">{getDisplayName(employee)}</h3>
                      <div className="flex items-center space-x-2">
                        {getRoleBadge(employee.role)}
                        {getStatusBadge(employee.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{employee.profile?.email}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span>{employee.department}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Son giriş: {employee.lastLogin}</span>
                      <span>•</span>
                      <span>Katılım: {employee.joinDate}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleStatus(employee.id, employee.status)}
                      className={employee.status === 'active' ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                    >
                      {employee.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Çalışanı Sil</AlertDialogTitle>
                          <AlertDialogDescription>
                            {getDisplayName(employee)} adlı çalışanı sistemden kalıcı olarak silmek istediğinizden emin misiniz? 
                            Bu işlem geri alınamaz.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Sil
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredEmployees.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Çalışan bulunamadı</h3>
                <p className="text-gray-600">Arama kriterlerinizi değiştirin veya yeni çalışan ekleyin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 