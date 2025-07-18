'use client';

import { useState } from 'react';
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

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Dummy data - gerçek veriler API'den gelecek
  const employees = [
    {
      id: '1',
      name: 'Ahmet Yılmaz',
      email: 'ahmet@company.com',
      role: 'admin',
      department: 'Satış',
      status: 'active',
      lastLogin: '2 saat önce',
      joinDate: '15 Ocak 2024',
      avatar: null
    },
    {
      id: '2',
      name: 'Ayşe Kaya',
      email: 'ayse@company.com',
      role: 'user',
      department: 'Müşteri Hizmetleri',
      status: 'active',
      lastLogin: '1 gün önce',
      joinDate: '10 Ocak 2024',
      avatar: null
    },
    {
      id: '3',
      name: 'Mehmet Öz',
      email: 'mehmet@company.com',
      role: 'user',
      department: 'Pazarlama',
      status: 'inactive',
      lastLogin: '1 hafta önce',
      joinDate: '5 Ocak 2024',
      avatar: null
    },
    {
      id: '4',
      name: 'Fatma Demir',
      email: 'fatma@company.com',
      role: 'moderator',
      department: 'Satış',
      status: 'active',
      lastLogin: '30 dk önce',
      joinDate: '20 Aralık 2023',
      avatar: null
    }
  ];

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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

  const handleAddEmployee = () => {
    // API çağrısı burada yapılacak
    console.log('Yeni çalışan ekleniyor:', newEmployee);
    setIsAddEmployeeOpen(false);
    setNewEmployee({ name: '', email: '', password: '' });
    setShowPassword(false);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    // API çağrısı burada yapılacak
    console.log('Çalışan siliniyor:', employeeId);
  };

  const handleToggleStatus = (employeeId: string, currentStatus: string) => {
    // API çağrısı burada yapılacak
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    console.log('Çalışan durumu değiştiriliyor:', employeeId, newStatus);
  };

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
                  <div className="text-2xl font-bold text-gray-900">{employees.length}</div>
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
                  <div className="text-2xl font-bold text-gray-900">8</div>
                  <p className="text-sm text-gray-600">Aktif Session</p>
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
                      {getInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900">{employee.name}</h3>
                      <div className="flex items-center space-x-2">
                        {getRoleBadge(employee.role)}
                        {getStatusBadge(employee.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{employee.email}</span>
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
                            {employee.name} adlı çalışanı sistemden kalıcı olarak silmek istediğinizden emin misiniz? 
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