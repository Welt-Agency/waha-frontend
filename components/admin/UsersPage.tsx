'use client';

import { useState } from 'react';
import { Users, Search, Plus, Edit, Trash2, Building2, Shield, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    companyId: '',
    role: 'company_admin'
  });

  // Dummy data - gerçek veriler API'den gelecek
  const companies = [
    { id: '1', name: 'ABC Teknoloji Ltd.' },
    { id: '2', name: 'XYZ Pazarlama A.Ş.' },
    { id: '3', name: 'Demo Şirket' }
  ];

  const users = [
    {
      id: '1',
      name: 'Ahmet Yılmaz',
      email: 'ahmet@abcteknoloji.com',
      role: 'company_admin',
      companyId: '1',
      companyName: 'ABC Teknoloji Ltd.',
      status: 'active',
      lastLogin: '2 saat önce',
      createdDate: '15 Ocak 2024',
      avatar: null
    },
    {
      id: '2',
      name: 'Ayşe Kaya',
      email: 'ayse@xyzpazarlama.com',
      role: 'company_admin',
      companyId: '2',
      companyName: 'XYZ Pazarlama A.Ş.',
      status: 'active',
      lastLogin: '1 gün önce',
      createdDate: '10 Ocak 2024',
      avatar: null
    },
    {
      id: '3',
      name: 'Mehmet Öz',
      email: 'mehmet@demo.com',
      role: 'company_admin',
      companyId: '3',
      companyName: 'Demo Şirket',
      status: 'inactive',
      lastLogin: '1 hafta önce',
      createdDate: '5 Ocak 2024',
      avatar: null
    },
    {
      id: '4',
      name: 'Fatma Demir',
      email: 'fatma@abcteknoloji.com',
      role: 'user',
      companyId: '1',
      companyName: 'ABC Teknoloji Ltd.',
      status: 'active',
      lastLogin: '30 dk önce',
      createdDate: '20 Aralık 2023',
      avatar: null
    }
  ];

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'company_admin':
        return <Badge className="bg-blue-100 text-blue-800">Firma Yöneticisi</Badge>;
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

  const handleAddUser = () => {
    // API çağrısı burada yapılacak
    console.log('Yeni kullanıcı ekleniyor:', newUser);
    setIsAddUserOpen(false);
    setNewUser({ name: '', email: '', companyId: '', role: 'company_admin' });
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      role: user.role
    });
  };

  const handleUpdateUser = () => {
    // API çağrısı burada yapılacak
    console.log('Kullanıcı güncelleniyor:', editingUser.id, newUser);
    setEditingUser(null);
    setNewUser({ name: '', email: '', companyId: '', role: 'company_admin' });
  };

  const handleDeleteUser = (userId: string) => {
    // API çağrısı burada yapılacak
    console.log('Kullanıcı siliniyor:', userId);
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    // API çağrısı burada yapılacak
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    console.log('Kullanıcı durumu değiştiriliyor:', userId, newStatus);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Kullanıcı Yönetimi</h1>
              <p className="text-gray-600">Firmalara yönetici atayın ve kullanıcıları yönetin</p>
            </div>
            
            {/* Add User Button */}
            <Dialog open={isAddUserOpen || !!editingUser} onOpenChange={(open) => {
              if (!open) {
                setIsAddUserOpen(false);
                setEditingUser(null);
                setNewUser({ name: '', email: '', companyId: '', role: 'company_admin' });
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setIsAddUserOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Kullanıcı Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="userName">Ad Soyad</Label>
                    <Input
                      id="userName"
                      placeholder="Kullanıcının adı soyadı"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="userEmail">Email</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      placeholder="kullanici@firma.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company">Firma</Label>
                    <Select value={newUser.companyId} onValueChange={(value) => setNewUser({...newUser, companyId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Firma seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Rol seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company_admin">Firma Yöneticisi</SelectItem>
                        <SelectItem value="user">Kullanıcı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAddUserOpen(false);
                        setEditingUser(null);
                        setNewUser({ name: '', email: '', companyId: '', role: 'company_admin' });
                      }}
                    >
                      İptal
                    </Button>
                    <Button 
                      onClick={editingUser ? handleUpdateUser : handleAddUser}
                      disabled={!newUser.name || !newUser.email || !newUser.companyId || !newUser.role}
                      className="bg-slate-900 hover:bg-slate-800"
                    >
                      {editingUser ? 'Güncelle' : 'Kullanıcı Ekle'}
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
              placeholder="Kullanıcılarda ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-slate-900 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                  <p className="text-sm text-gray-600">Toplam Kullanıcı</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.role === 'company_admin').length}
                  </div>
                  <p className="text-sm text-gray-600">Firma Yöneticisi</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <UserCheck className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.status === 'active').length}
                  </div>
                  <p className="text-sm text-gray-600">Aktif Kullanıcı</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{companies.length}</div>
                  <p className="text-sm text-gray-600">Toplam Firma</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı Listesi</CardTitle>
            <CardDescription>
              Tüm kullanıcıların listesi ve yönetim seçenekleri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback className="bg-slate-100 text-slate-700">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900">{user.name}</h3>
                      <div className="flex items-center space-x-2">
                        {getRoleBadge(user.role)}
                        {getStatusBadge(user.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="text-sm text-gray-600">{user.email}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <div className="flex items-center space-x-1">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{user.companyName}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Son giriş: {user.lastLogin}</span>
                      <span>•</span>
                      <span>Katılım: {user.createdDate}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleStatus(user.id, user.status)}
                      className={user.status === 'active' ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
                    >
                      {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
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
                          <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
                          <AlertDialogDescription>
                            {user.name} adlı kullanıcıyı sistemden kalıcı olarak silmek istediğinizden emin misiniz? 
                            Bu işlem geri alınamaz.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteUser(user.id)}
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
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Kullanıcı bulunamadı</h3>
                <p className="text-gray-600">Arama kriterlerinizi değiştirin veya yeni kullanıcı ekleyin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 