'use client';

import { useState } from 'react';
import { Users, Search, Plus, Phone, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState('');

  // Dummy data
  const contacts = [
    {
      id: '1',
      name: 'Ahmet Yılmaz',
      phone: '+905551234567',
      email: 'ahmet@example.com',
      lastMessage: 'Merhaba, ürün hakkında bilgi alabilir miyim?',
      lastMessageTime: '2 saat önce',
      avatar: null,
      tags: ['Müşteri', 'Satış']
    },
    {
      id: '2',
      name: 'Ayşe Kaya',
      phone: '+905551234568',
      email: 'ayse@example.com',
      lastMessage: 'Teşekkür ederim, harika bir hizmet!',
      lastMessageTime: '1 gün önce',
      avatar: null,
      tags: ['VIP', 'Müşteri']
    },
    {
      id: '3',
      name: 'Mehmet Öz',
      phone: '+905551234569',
      email: 'mehmet@example.com',
      lastMessage: 'Siparişim ne zaman gelecek?',
      lastMessageTime: '3 gün önce',
      avatar: null,
      tags: ['Sipariş', 'Takip']
    }
  ];

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Contacts</h1>
              <p className="text-gray-600">Müşteri iletişim bilgilerini yönetin</p>
            </div>
            <Button className="bg-[#075E54] hover:bg-[#064e44]">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kişi Ekle
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Kişilerde ara..."
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
                <Users className="h-8 w-8 text-[#075E54] mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{contacts.length}</div>
                  <p className="text-sm text-gray-600">Toplam Kişi</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">24</div>
                  <p className="text-sm text-gray-600">Aktif Konuşma</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <Phone className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">156</div>
                  <p className="text-sm text-gray-600">Toplam Mesaj</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contacts List */}
        <Card>
          <CardHeader>
            <CardTitle>Kişi Listesi</CardTitle>
            <CardDescription>
              Tüm müşteri iletişim bilgileriniz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={contact.avatar || undefined} />
                    <AvatarFallback className="bg-[#075E54] text-white">
                      {getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900">{contact.name}</h3>
                      <span className="text-sm text-gray-500">{contact.lastMessageTime}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{contact.phone}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{contact.email}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{contact.lastMessage}</p>
                    
                    <div className="flex items-center space-x-2">
                      {contact.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredContacts.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Kişi bulunamadı</h3>
                <p className="text-gray-600">Arama kriterlerinizi değiştirin veya yeni kişi ekleyin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}