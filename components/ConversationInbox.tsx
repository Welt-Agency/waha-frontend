'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, Phone, Archive, Pin, Volume2, VolumeX, Clock, Send, Paperclip, Smile, Plus, X, RefreshCw, AlertCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { authenticatedFetch } from '@/lib/auth';
import { useSessionStore, APIMessage } from '@/hooks/useSessionStore';

// API Response Interfaces
interface APIChatOverview {
  id: string;
  name: string | null;
  picture: string | null;
  lastMessage: {
    id: string;
    timestamp: number;
    from: string;
    fromMe: boolean;
    source: string;
    body: string;
    to: string | null;
    participant: string | null;
    hasMedia: boolean;
    media: any;
    ack: number;
    ackName: string;
    replyTo: any;
    _data: any;
  };
  _chat: {
    id: string;
    name: string;
    conversationTimestamp: number;
  };
}

interface APISession {
  name: string;
  status: string;
  config: {
    metadata: any;
    webhooks: any[];
  };
  me?: {
    id: string;
    pushName: string;
    jid: string;
  };
  assignedWorker: string;
}

// UI Interfaces
interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  sessionLabel: string;
  sessionPhone: string;
  sessionId: string;
  isOnline: boolean;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  rawChatId: string;
  lastMessageAck: number; // Added for unread count
  lastMessageId: string; // Added for unread count
  lastMessageTimestamp?: number;
}

interface Message {
  id: string;
  contactId: string;
  content: string;
  timestamp: string;
  isOutgoing: boolean;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'document';
  rawId: string;
}

interface Session {
  id: string;
  label: string;
  phone: string;
  name: string;
}

export default function ConversationInbox() {
  const {
    sessions,
    loading: sessionsLoading,
    error: sessionsError,
    fetchSessions,
    overviews,
    messages: storeMessages,
    fetchOverview,
    prefetchAllOverviews,
    addMessage,
  } = useSessionStore();
  
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'pinned' | 'archived'>('all');
  const [messageInput, setMessageInput] = useState('');
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [allSessionsMode, setAllSessionsMode] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  // On mount: fetch sessions if not loaded
  useEffect(() => {
    if (sessions.length === 0) {
      fetchSessions();
    }
  }, [sessions.length, fetchSessions]);

  // İlk session seçimini sadece bir kere yap
  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0].name);
    }
  }, [sessions, selectedSession]);

  // Websocket başlatma - SessionManager'da zaten başlatılıyor
  // useEffect(() => {
  //   if (sessions.length > 0 && !websocketStarted) {
  //     subscribeToChatOverview();
  //     setWebsocketStarted(true);
  //   }
  // }, [sessions, websocketStarted, subscribeToChatOverview]);

  // selectedSession değiştiğinde overview cache'de yoksa fetch et, ilk fetch'te prefetch başlat
  useEffect(() => {
    if (selectedSession) {
      setLoading(true);
      if (overviews[selectedSession]) {
        setContacts(formatContacts(overviews[selectedSession], selectedSession));
        setLoading(false);
      } else {
        fetchOverview(selectedSession).then((data) => {
          if (data) {
            setContacts(formatContacts(data, selectedSession));
            // Sadece ilk fetch'te prefetch başlat
            prefetchAllOverviews(selectedSession);
          }
          setLoading(false);
        });
      }
    }
  }, [selectedSession, overviews, fetchOverview, prefetchAllOverviews]);

  // Overviews değiştiğinde contacts'i güncelle
  useEffect(() => {
    if (selectedSession && overviews[selectedSession]) {
      setContacts(formatContacts(overviews[selectedSession], selectedSession));
    }
  }, [overviews, selectedSession]);

  // Store'daki messages değiştiğinde UI messages'i güncelle
  useEffect(() => {
    if (selectedContact) {
      const contact = contacts.find(c => c.id === selectedContact);
      if (contact && storeMessages[contact.rawChatId]) {
        const apiMessages = storeMessages[contact.rawChatId];
        const formattedMessages: Message[] = apiMessages.map((msg: APIMessage) => {
          const messageTime = new Date(msg.timestamp * 1000);
          const timeString = messageTime.toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          let status: 'sent' | 'delivered' | 'read' = 'sent';
          if (msg.ack === 2) status = 'delivered';
          if (msg.ack === 3) status = 'read';
          
          let messageType: 'text' | 'image' | 'document' = 'text';
          if (msg.hasMedia) {
            messageType = 'image';
          }
          
          return {
            id: msg.id,
            contactId: selectedContact,
            content: msg.body,
            timestamp: timeString,
            isOutgoing: msg.fromMe,
            status: status,
            type: messageType,
            rawId: msg.id
          };
        }).reverse();
        
        setMessages(formattedMessages);
      }
    }
  }, [storeMessages, selectedContact, contacts]);

  // Helper to format contacts from overview
  function formatContacts(apiChats: any[], sessionId: string): Contact[] {
    return apiChats.map((chat, index) => {
      const phoneNumber = chat.id.replace('@c.us', '');
      const displayName = chat.name || phoneNumber;
      const lastMessageTime = new Date(chat.lastMessage.timestamp * 1000);
      const timeAgo = getTimeAgo(lastMessageTime);
      return {
        id: `${sessionId}_${chat.id}`,
        name: displayName,
        phone: `+${phoneNumber}`,
        avatar: chat.picture || undefined,
        lastMessage: chat.lastMessage.body || 'Media mesajı',
        timestamp: timeAgo,
        unreadCount: 0, // API'den bu bilgi gelmiyorsa varsayılan 0
        sessionLabel: sessions.find(s => s.name === sessionId)?.me?.pushName || sessionId,
        sessionPhone: sessions.find(s => s.name === sessionId)?.me?.id?.replace('@c.us', '') || '',
        sessionId: sessionId,
        isOnline: false,
        isPinned: false,
        isMuted: false,
        isArchived: false,
        rawChatId: chat.id,
        lastMessageAck: chat.lastMessage.ack, // Added for unread count
        lastMessageId: chat.lastMessage.id, // Added for unread count
        lastMessageTimestamp: chat.lastMessage.timestamp,
      };
    });
  }

  // Fetch messages for a specific chat
  const fetchMessages = async (sessionId: string, chatId: string, contactId: string) => {
    try {
      setMessagesLoading(true);
      const response = await authenticatedFetch(`/chats/${sessionId}/${chatId}/messages`);
      if (!response.ok) throw new Error('Mesajlar alınamadı');
      
      const apiMessages: APIMessage[] = await response.json();
      
      // Store'a mesajları ekle
      apiMessages.forEach(msg => {
        addMessage(chatId, msg);
      });
      
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Send message via API
  const sendMessage = async (chatId: string, sessionId: string, text: string) => {
    try {
      setSendingMessage(true);
      const response = await authenticatedFetch('/send-text', {
        method: 'POST',
        body: JSON.stringify({
          chatId: chatId,
          reply_to: null,
          text: text,
          linkPreview: true,
          linkPreviewHighQuality: false,
          session: sessionId
        })
      });
      
      if (!response.ok) throw new Error('Mesaj gönderilemedi');
      
      const result = await response.json();
      
      // Gönderilen mesajı store'a ekle (websocket'ten gelene kadar geçici olarak)
      // Eğer websocket'ten aynı mesaj gelirse, bu geçici mesaj otomatik olarak güncellenecek
      const tempMessage: APIMessage = {
        id: result.id || `temp_${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000),
        from: sessions.find(s => s.name === sessionId)?.me?.id || '',
        fromMe: true,
        source: sessionId,
        to: chatId,
        participant: null,
        body: text,
        hasMedia: false,
        media: null,
        ack: 1, // sent
        ackName: 'sent',
        author: sessions.find(s => s.name === sessionId)?.me?.id || '',
        location: null,
        vCards: [],
        _data: result,
        replyTo: null
      };
      
      addMessage(chatId, tempMessage);
      
      return result;
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    } finally {
      setSendingMessage(false);
    }
  };

  // Helper function to get time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Şimdi';
    if (diffInMinutes < 60) return `${diffInMinutes} dk önce`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Dün';
    if (diffInDays < 7) return `${diffInDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
  };

  // UseEffect hooks
  useEffect(() => {
    if (selectedSession === 'ALL') {
      handleSessionChange('ALL');
    }
  }, [sessions]);

  // selectedSession değiştiğinde ve ALL değilse otomatik olarak fetchChats çağır
  useEffect(() => {
    if (selectedSession && selectedSession !== 'ALL') {
      // fetchChats(selectedSession); // This function is removed, use overview cache
    }
  }, [selectedSession]);

  useEffect(() => {
    if (selectedContact) {
      const contact = contacts.find(c => c.id === selectedContact);
      if (contact) {
        // Mesajları fetch et
        fetchMessages(contact.sessionId, contact.rawChatId, contact.id);
      }
    }
  }, [selectedContact]);

  // Event handlers
  const handleSessionChange = (newSessionId: string) => {
    setSelectedSession(newSessionId);
    setSelectedContact(null);
    setMessages([]);
    setAllSessionsMode(newSessionId === 'ALL');
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contact.phone.includes(searchQuery);
    
    switch (filterType) {
      case 'unread':
        // Sadece ack'si 2 olanlar (yani okunmamışlar)
        return matchesSearch && contact.lastMessageAck === 2 && contact.lastMessageId.startsWith('false');
      case 'pinned':
        return matchesSearch && contact.isPinned;
      case 'archived':
        return matchesSearch && contact.isArchived;
      default:
        return matchesSearch && !contact.isArchived;
    }
  });

  const selectedContactData = contacts.find(c => c.id === selectedContact);
  const contactMessages = messages.filter(m => m.contactId === selectedContact);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContactData || sendingMessage) {
      return;
    }

    try {
      await sendMessage(selectedContactData.rawChatId, selectedContactData.sessionId, messageInput);
      setMessageInput('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleStartNewConversation = async () => {
    if (!newPhoneNumber.trim() || !selectedSession) {
      return;
    }

    const selectedSessionData = sessions.find(s => s.name === selectedSession);
    if (!selectedSessionData) return;

    // Format phone number for WhatsApp (remove + and spaces)
    const formattedPhone = newPhoneNumber.replace(/[\s\+\-\(\)]/g, '');
    const chatId = `${formattedPhone}@c.us`;

    // Check if conversation already exists
    const existingContact = contacts.find(c => c.rawChatId === chatId);
    if (existingContact) {
      setSelectedContact(existingContact.id);
      setIsNewConversationOpen(false);
      setNewPhoneNumber('');
      setSelectedSession('');
      return;
    }

    // Create new contact locally and send initial message
    const newContact: Contact = {
      id: `${selectedSession}_${chatId}`,
      name: formattedPhone,
      phone: `+${formattedPhone}`,
      lastMessage: 'Yeni konuşma başlatıldı',
      timestamp: 'Şimdi',
      unreadCount: 0,
      sessionLabel: selectedSessionData.me?.pushName || selectedSession,
      sessionPhone: selectedSessionData.me?.id?.replace('@c.us', '') || '',
      sessionId: selectedSession,
      isOnline: false,
      isPinned: false,
      isMuted: false,
      isArchived: false,
      rawChatId: chatId,
      lastMessageAck: 0, // Initialize for new conversation
      lastMessageId: 'false', // Initialize for new conversation
      lastMessageTimestamp: undefined // Initialize for new conversation
    };

    setContacts(prev => [newContact, ...prev]);
    setSelectedContact(newContact.id);
    setIsNewConversationOpen(false);
    setNewPhoneNumber('');
    setSelectedSession('');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Contacts Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">Konuşmalar</h1>
            
            {/* New Conversation Button */}
            <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-[#075E54] hover:bg-[#064e44] text-white shadow-sm"
                  disabled={!selectedSession}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-[#075E54]" />
                    <span>Yeni Konuşma Başlat</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon Numarası</Label>
                    <Input
                      id="phone"
                      placeholder="905XXXXXXXXX"
                      value={newPhoneNumber}
                      onChange={(e) => setNewPhoneNumber(e.target.value)}
                      className="h-11"
                    />
                    <p className="text-xs text-gray-500">Ülke kodu ile birlikte girin (örn: 905551234567)</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="session">Session Seç</Label>
                    <Select value={selectedSession} onValueChange={handleSessionChange}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Session seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tüm Sessionlar</SelectItem>
                        {sessions.map((session) => (
                          <SelectItem key={session.name} value={session.name}>
                            <div className="flex flex-col">
                              <span className="font-medium">{session.me?.pushName || session.name}</span>
                              <span className="text-sm text-gray-500">+{session.me?.id?.replace('@c.us', '')}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsNewConversationOpen(false)}
                    >
                      İptal
                    </Button>
                    <Button 
                      onClick={handleStartNewConversation}
                      disabled={!newPhoneNumber.trim() || !selectedSession}
                      className="bg-[#075E54] hover:bg-[#064e44]"
                    >
                      Konuşmayı Başlat
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Session Selector */}
          {sessions.length > 0 && (
            <div className="mb-3">
              <Select value={selectedSession} onValueChange={handleSessionChange}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Session seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tüm Sessionlar</SelectItem>
                  {sessions.map((session) => (
                    <SelectItem key={session.name} value={session.name}>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{session.me?.pushName || session.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Konuşmalarda ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>

          {/* Modern Filters */}
          <div className="flex flex-wrap gap-1">
            {[
              { key: 'all', label: 'Tümü', count: contacts.length },
              { key: 'unread', label: 'Okunmamış', count: contacts.filter(c => c.lastMessageAck === 2 && c.lastMessageId.startsWith('false')).length },
              { key: 'pinned', label: 'Sabitlenmiş', count: contacts.filter(c => c.isPinned).length },
              { key: 'archived', label: 'Arşiv', count: contacts.filter(c => c.isArchived).length }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setFilterType(filter.key as any)}
                className={cn(
                  "flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                  filterType === filter.key 
                    ? 'bg-[#075E54] text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <span>{filter.label}</span>
                {filter.count > 0 && (
                  <span className={cn(
                    "text-xs px-1 py-0.5 rounded-full min-w-[16px] text-center",
                    filterType === filter.key 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-300 text-gray-600'
                  )}>
                    {filter.count > 99 ? '99+' : filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading/Error States */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Yükleniyor...</span>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">{error}</p>
              <Button 
                onClick={() => selectedSession && fetchOverview(selectedSession)}
                size="sm"
                className="mt-2"
              >
                Tekrar Dene
              </Button>
            </div>
          </div>
        )}

        {/* Contacts List */}
        {!loading && !error && (
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {filteredContacts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">{selectedSession ? 'Konuşma bulunamadı' : 'Bir session seçin'}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedSession ? 'Yeni bir konuşma başlatmak için "Yeni Chat" butonunu kullanın' : 'Mesajlaşmaya başlamak için yukarıdan bir session seçin'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => setSelectedContact(contact.id)}
                    className={cn(
                      "p-4 cursor-pointer transition-all duration-200 hover:bg-white hover:shadow-sm border-l-4",
                      selectedContact === contact.id 
                        ? "bg-white border-l-[#075E54] shadow-sm" 
                        : "bg-transparent border-l-transparent hover:border-l-gray-200"
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                          <AvatarImage src={contact.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-[#075E54] to-[#128C7E] text-white font-medium">
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        {contact.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                        {contact.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 bg-[#25D366] text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                            {contact.unreadCount > 9 ? '9+' : contact.unreadCount}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2 min-w-0">
                            <h3 className={cn(
                              "font-medium text-gray-900 truncate",
                              contact.unreadCount > 0 && "font-semibold"
                            )}>
                              {contact.name}
                            </h3>
                            <div className="flex items-center space-x-1">
                              {contact.isPinned && (
                                <Pin className="h-3 w-3 text-gray-400 fill-current" />
                              )}
                              {contact.isMuted && (
                                <VolumeX className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{contact.timestamp}</span>
                        </div>
                        
                        <p className={cn(
                          "text-sm text-gray-600 truncate mb-2",
                          contact.unreadCount > 0 && "font-medium text-gray-800"
                        )}>
                          {contact.lastMessage}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-gray-50 text-gray-600 border-gray-200 font-normal"
                          >
                            {contact.sessionLabel}
                          </Badge>
                          {contact.unreadCount > 0 && (
                            <div className="w-2 h-2 bg-[#25D366] rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedContactData ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                    <AvatarImage src={selectedContactData.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-[#075E54] to-[#128C7E] text-white font-medium">
                      {getInitials(selectedContactData.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedContactData.name}</h2>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{selectedContactData.phone}</span>
                      <span>•</span>
                      <span className="text-[#075E54] font-medium">via {selectedContactData.sessionLabel}</span>
                      {selectedContactData.isOnline && (
                        <>
                          <span>•</span>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-green-600 font-medium">Çevrimiçi</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (selectedContactData) {
                        fetchMessages(selectedContactData.sessionId, selectedContactData.rawChatId, selectedContactData.id);
                      }
                    }}
                    disabled={messagesLoading}
                    className="hover:bg-gray-50"
                  >
                    {messagesLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="hover:bg-gray-50">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="flex items-center space-x-2">
                        <Pin className="h-4 w-4" />
                        <span>{selectedContactData.isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center space-x-2">
                        {selectedContactData.isMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                        <span>{selectedContactData.isMuted ? 'Sesi Aç' : 'Sessize Al'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center space-x-2">
                        <Archive className="h-4 w-4" />
                        <span>Arşivle</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="flex items-center space-x-3 text-gray-500">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span className="font-medium">Mesajlar yükleniyor...</span>
                  </div>
                </div>
              ) : contactMessages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-white rounded-full p-6 w-20 h-20 mx-auto mb-4 shadow-sm">
                    <MessageSquare className="h-8 w-8 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Henüz mesaj yok</h3>
                  <p className="text-gray-500">İlk mesajı göndererek konuşmayı başlatın!</p>
                </div>
              ) : (
                contactMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.isOutgoing ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm relative",
                        message.isOutgoing
                          ? "bg-[#075E54] text-white rounded-br-md"
                          : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                      )}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className={cn(
                        "flex items-center justify-end space-x-1 mt-2 text-xs",
                        message.isOutgoing ? "text-green-100" : "text-gray-500"
                      )}>
                        <span className="font-medium">{message.timestamp}</span>
                        {message.isOutgoing && (
                          <div className="flex ml-1">
                            {message.status === 'sent' && <Clock className="h-3 w-3" />}
                            {message.status === 'delivered' && (
                              <div className="flex">
                                <div className="h-3 w-3 border border-current rounded-full mr-0.5 opacity-70"></div>
                                <div className="h-3 w-3 border border-current rounded-full"></div>
                              </div>
                            )}
                            {message.status === 'read' && (
                              <div className="flex text-blue-300">
                                <div className="h-3 w-3 bg-current rounded-full mr-0.5"></div>
                                <div className="h-3 w-3 bg-current rounded-full"></div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
              <div className="flex items-end space-x-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-shrink-0 h-11 w-11 rounded-full hover:bg-gray-50"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Mesaj yazın..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[44px] max-h-32 resize-none rounded-2xl border-gray-200 focus:border-[#075E54] focus:ring-[#075E54] pr-12"
                    disabled={sendingMessage}
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full hover:bg-gray-100"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || sendingMessage}
                  className="flex-shrink-0 h-11 w-11 rounded-full bg-[#075E54] hover:bg-[#064e44] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
            <div className="text-center max-w-md">
              <div className="bg-white rounded-full p-8 w-24 h-24 mx-auto mb-6 shadow-lg">
                <MessageSquare className="h-8 w-8 text-[#075E54] mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">WhatsApp Web benzeri deneyim</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Sol taraftan bir konuşma seçerek mesajlaşmaya başlayın. Yeni konuşmalar başlatabilir, 
                mevcut konuşmaları yönetebilir ve gerçek zamanlı mesajlaşabilirsiniz.
              </p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Gerçek zamanlı</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Çoklu session</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Güvenli</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}