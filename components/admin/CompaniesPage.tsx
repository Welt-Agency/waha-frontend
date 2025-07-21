'use client';

import { useState } from 'react';
import { Building2, Search, Plus, Edit, Trash2, Settings, Users, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [newCompany, setNewCompany] = useState({
    name: '',
    email: '',
    sessionLimit: 5
  });

  // Dummy data - gerçek veriler API'den gelecek
  const companies = [
    {
      id: '1',
      name: 'ABC Teknoloji Ltd.',
      email: 'admin@abcteknoloji.com',
      sessionLimit: 10,
      activeSessions: 7,
      totalUsers: 15,
      createdDate: '15 Ocak 2024',
      status: 'active',
      subscription: 'premium'
    },
    {
      id: '2',
      name: 'XYZ Pazarlama A.Ş.',
      email: 'info@xyzpazarlama.com',
      sessionLimit: 5,
      activeSessions: 3,
      totalUsers: 8,
      createdDate: '10 Ocak 2024',
      status: 'active',
      subscription: 'basic'
    },
    {
      id: '3',
      name: 'Demo Şirket',
      email: 'demo@company.com',
      sessionLimit: 3,
      activeSessions: 1,
      totalUsers: 5,
      createdDate: '5 Ocak 2024',
      status: 'inactive',
      subscription: 'trial'
    }
  ];

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const getSubscriptionBadge = (subscription: string) => {
    switch (subscription) {
      case 'premium':
        return <Badge className="bg-purple-100 text-purple-800">Premium</Badge>;
      case 'basic':
        return <Badge className="bg-blue-100 text-blue-800">Basic</Badge>;
      case 'trial':
        return <Badge className="bg-yellow-100 text-yellow-800">Trial</Badge>;
      default:
        return <Badge variant="outline">{subscription}</Badge>;
    }
  };

  const handleAddCompany = () => {
    // API çağrısı burada yapılacak
    console.log('Yeni firma ekleniyor:', newCompany);
    setIsAddCompanyOpen(false);
    setNewCompany({ name: '', email: '', sessionLimit: 5 });
  };

  const handleEditCompany = (company: any) => {
    setEditingCompany(company);
    setNewCompany({
      name: company.name,
      email: company.email,
      sessionLimit: company.sessionLimit
    });
  };

  const handleUpdateCompany = () => {
    // API çağrısı burada yapılacak
    console.log('Firma güncelleniyor:', editingCompany.id, newCompany);
    setEditingCompany(null);
    setNewCompany({ name: '', email: '', sessionLimit: 5 });
  };

  const handleDeleteCompany = (companyId: string) => {
    // API çağrısı burada yapılacak
    console.log('Firma siliniyor:', companyId);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Firma Yönetimi</h1>
              <p className="text-gray-600">Sistemdeki firmaları yönetin ve session limitlerini belirleyin</p>
            </div>
            
            {/* Add Company Button */}
            <Dialog open={isAddCompanyOpen || !!editingCompany} onOpenChange={(open) => {
              if (!open) {
                setIsAddCompanyOpen(false);
                setEditingCompany(null);
                setNewCompany({ name: '', email: '', sessionLimit: 5 });
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setIsAddCompanyOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Firma Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCompany ? 'Firma Düzenle' : 'Yeni Firma Ekle'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Firma Adı</Label>
                    <Input
                      id="companyName"
                      placeholder="Firma adını girin"
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Admin Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      placeholder="admin@firma.com"
                      value={newCompany.email}
                      onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sessionLimit">Session Limiti</Label>
                    <Input
                      id="sessionLimit"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="5"
                      value={newCompany.sessionLimit}
                      onChange={(e) => setNewCompany({...newCompany, sessionLimit: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAddCompanyOpen(false);
                        setEditingCompany(null);
                        setNewCompany({ name: '', email: '', sessionLimit: 5 });
                      }}
                    >
                      İptal
                    </Button>
                    <Button 
                      onClick={editingCompany ? handleUpdateCompany : handleAddCompany}
                      disabled={!newCompany.name || !newCompany.email || !newCompany.sessionLimit}
                      className="bg-slate-900 hover:bg-slate-800"
                    >
                      {editingCompany ? 'Güncelle' : 'Firma Ekle'}
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
              placeholder="Firmalarda ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-slate-900 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{companies.length}</div>
                  <p className="text-sm text-gray-600">Toplam Firma</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Smartphone className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {companies.reduce((sum, c) => sum + c.activeSessions, 0)}
                  </div>
                  <p className="text-sm text-gray-600">Aktif Session</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {companies.reduce((sum, c) => sum + c.totalUsers, 0)}
                  </div>
                  <p className="text-sm text-gray-600">Toplam Kullanıcı</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companies List */}
        <Card>
          <CardHeader>
            <CardTitle>Firma Listesi</CardTitle>
            <CardDescription>
              Tüm firmaların listesi ve yönetim seçenekleri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCompanies.map((company) => (
                <div key={company.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="bg-slate-100 p-3 rounded-lg">
                    <Building2 className="h-6 w-6 text-slate-700" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{company.name}</h3>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(company.status)}
                        {getSubscriptionBadge(company.subscription)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="text-sm text-gray-600">{company.email}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-600">Oluşturulma: {company.createdDate}</span>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Smartphone className="h-4 w-4" />
                        <span>Session: {company.activeSessions}/{company.sessionLimit}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>Kullanıcı: {company.totalUsers}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditCompany(company)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Firmayı Sil</AlertDialogTitle>
                          <AlertDialogDescription>
                            {company.name} adlı firmayı sistemden kalıcı olarak silmek istediğinizden emin misiniz? 
                            Bu işlem tüm kullanıcıları ve session'ları da silecektir ve geri alınamaz.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteCompany(company.id)}
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
            
            {filteredCompanies.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Firma bulunamadı</h3>
                <p className="text-gray-600">Arama kriterlerinizi değiştirin veya yeni firma ekleyin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 