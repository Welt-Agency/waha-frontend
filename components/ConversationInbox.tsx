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
  lastMessageId: string; // Added for unread count - message ID for unread detection
  lastMessageTimestamp?: number;
}

interface Message {
  id: string;
  contactId: string;
  content: string;
  timestamp: string;
  rawTimestamp?: number; // Gerçek timestamp için
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
    chatWebsocketConnected,
    subscribeToChatOverview,
  } = useSessionStore();

  // Cache'i bypass eden overview fetch fonksiyonu
  const fetchOverviewForce = async (sessionId: string, limit: number = 25, offset: number = 0) => {
    try {
      const res = await authenticatedFetch(`/chats/${sessionId}/overview?limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error('Overview alınamadı');
      const data = await res.json();
      return data;
    } catch (e) {
      console.error(`Error fetching overview for session ${sessionId}:`, e);
      return undefined;
    }
  };
  
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
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);

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

  // Websocket başlatma
  useEffect(() => {
    if (sessions.length > 0) {
      console.log('Starting WebSocket connection...');
      subscribeToChatOverview();
    }
  }, [sessions, subscribeToChatOverview]);

  // selectedSession değiştiğinde overview cache'de yoksa fetch et, ilk fetch'te prefetch başlat
  useEffect(() => {
    if (selectedSession) {
      setLoading(true);
      
      if (selectedSession === 'ALL') {
        // Tüm session'ların overview'larını birleştir
        const allContacts: Contact[] = [];
        
        // Tüm session'lar için force fetch yap
        const sessionPromises = sessions.map(async (session) => {
          try {
            const data = await fetchOverviewForce(session.name, 25, 0); // Her session'dan ilk 25 chat
            if (data) {
              const sessionContacts = formatContacts(data, session.name);
              allContacts.push(...sessionContacts);
            }
          } catch (error) {
            console.error(`Error fetching overview for session ${session.name}:`, error);
          }
        });
        
        Promise.all(sessionPromises).then(() => {
          setContacts(allContacts);
          setLoading(false);
        });
      } else {
        if (overviews[selectedSession]) {
          setContacts(formatContacts(overviews[selectedSession], selectedSession));
          setLoading(false);
        } else {
          fetchOverview(selectedSession, 25, 0).then((data) => {
            if (data) {
              setContacts(formatContacts(data, selectedSession));
              // Sadece ilk fetch'te prefetch başlat
              prefetchAllOverviews(selectedSession);
            }
            setLoading(false);
          });
        }
      }
    }
  }, [selectedSession, overviews, fetchOverview, prefetchAllOverviews, sessions]);

  // Overviews değiştiğinde contacts'i güncelle
  useEffect(() => {
    if (selectedSession) {
      console.log('=== OVERVIEWS CHANGED ===');
      console.log('Selected session:', selectedSession);
      console.log('Current overviews keys:', Object.keys(overviews));
      console.log('Current overviews:', overviews);
      
      if (selectedSession === 'ALL') {
        // Tüm session'ların overview'larını birleştir
        const allContacts: Contact[] = [];
        sessions.forEach((session) => {
          if (overviews[session.name]) {
            console.log(`Processing session ${session.name} with ${overviews[session.name].length} chats`);
            const sessionContacts = formatContacts(overviews[session.name], session.name);
            allContacts.push(...sessionContacts);
          }
        });
        
        console.log('Total contacts after merge:', allContacts.length);
        setContacts(allContacts);
        console.log('Updated ALL contacts:', allContacts.length);
      } else if (overviews[selectedSession]) {
        console.log(`Processing single session ${selectedSession} with ${overviews[selectedSession].length} chats`);
        const newContacts = formatContacts(overviews[selectedSession], selectedSession);
        console.log('Formatted contacts:', newContacts.length);
        setContacts(newContacts);
        console.log('Updated contacts for session:', selectedSession, newContacts.length);
      } else {
        console.log('No overviews found for session:', selectedSession);
      }
      console.log('=== END OVERVIEWS CHANGED ===');
    }
  }, [overviews, selectedSession, sessions]);

  // Debug: Overviews değişikliklerini takip et
  useEffect(() => {
    console.log('=== OVERVIEWS STATE CHANGED ===');
    console.log('WebSocket connected:', chatWebsocketConnected);
    console.log('Overviews state changed:', {
      keys: Object.keys(overviews),
      selectedSession,
      hasOverviews: selectedSession ? !!overviews[selectedSession] : false,
      overviewCount: selectedSession && overviews[selectedSession] ? overviews[selectedSession].length : 0,
      contactsCount: contacts.length
    });
    
    // Socket'ten gelen overview'ların sayısını takip et
    if (selectedSession && overviews[selectedSession]) {
      const sessionOverviews = overviews[selectedSession];
      console.log(`Session ${selectedSession} has ${sessionOverviews.length} overviews and ${contacts.length} contacts`);
      
      // Eğer overview sayısı contact sayısından fazlaysa, yeni overview'lar gelmiş demektir
      if (sessionOverviews.length > contacts.length) {
        console.log(`New overviews detected: ${sessionOverviews.length - contacts.length} new chats`);
      }
      
      // Overview'ların detaylarını logla
      console.log('Current overviews:', sessionOverviews.map(o => ({ id: o.id, name: o.name, lastMessage: o.lastMessage?.body })));
      console.log('Current contacts:', contacts.map(c => ({ id: c.id, name: c.name, lastMessage: c.lastMessage })));
    }
    console.log('=== END OVERVIEWS STATE CHANGED ===');
  }, [overviews, selectedSession, contacts.length]);

  // Store'daki messages değiştiğinde UI messages'i güncelle
  useEffect(() => {
    if (selectedContact) {
      const contact = contacts.find(c => c.id === selectedContact);
      if (contact && storeMessages[contact.rawChatId]) {
        const apiMessages = storeMessages[contact.rawChatId];
        
        // Mevcut UI mesajlarını al
        const currentMessages = messages.filter(m => m.contactId === selectedContact);
        const currentMessageIds = new Set(currentMessages.map(m => m.rawId));
        
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
            rawTimestamp: msg.timestamp * 1000, // Gerçek timestamp ekle
            isOutgoing: msg.fromMe,
            status: status,
            type: messageType,
            rawId: msg.id
          };
        }).reverse();
        
        // Tüm mesajları güncelle (store'dan gelen en güncel hali)
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
      
      // session_name field'ını kullan, yoksa sessionId'yi kullan
      const actualSessionId = chat.session_name || sessionId;
      const sessionData = sessions.find(s => s.name === actualSessionId);
      
      // Yeni yapıda unreadCount backend'den geliyor, yoksa hesapla
      const unreadCount = chat.unreadCount || (chat.lastMessage.ack === 1 && chat.lastMessage.fromMe === false) ? 1 : 0;
      
      return {
        id: `${actualSessionId}_${chat.id}`,
        name: displayName,
        phone: `+${phoneNumber}`,
        avatar: chat.picture || undefined, // Picture yoksa undefined, mevcut avatar korunur
        lastMessage: chat.lastMessage.body || 'Media mesajı',
        timestamp: timeAgo,
        unreadCount: unreadCount,
        sessionLabel: sessionData?.me?.pushName || actualSessionId,
        sessionPhone: sessionData?.me?.id?.replace('@c.us', '') || '',
        sessionId: actualSessionId,
        isOnline: false,
        isPinned: false,
        isMuted: false,
        isArchived: false,
        rawChatId: chat.id,
        lastMessageAck: chat.lastMessage.ack, // Added for unread count
        lastMessageId: chat.lastMessage.id || '', // Added for unread count
        lastMessageTimestamp: chat.lastMessage.timestamp,
      };
    });
  }

  // Fetch messages for a specific chat
  const fetchMessages = async (sessionId: string, chatId: string, contactId: string, limit: number = 50, showLoading: boolean = true) => {
    try {
      if (showLoading) setMessagesLoading(true);
      const response = await authenticatedFetch(`/chats/${sessionId}/${chatId}/messages?limit=${limit}&offset=0`);
      if (!response.ok) throw new Error('Mesajlar alınamadı');
      
      const apiMessages: APIMessage[] = await response.json();
      
      // Store'a mesajları ekle
      apiMessages.forEach(msg => {
        addMessage(chatId, msg);
      });
      
      // İlk yüklemede daha fazla mesaj var mı kontrol et
      setHasMoreMessages(apiMessages.length === limit);
      
      // İlk yüklemede en alta scroll et
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Okunmamış mesajları okundu olarak işaretle
        const unreadMessages = apiMessages
          .filter(msg => !msg.fromMe && msg.ack < 3)
          .map(msg => msg.id);
        
        if (unreadMessages.length > 0) {
          markMessagesAsSeen(unreadMessages);
        }
      }, 100);
      
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      if (showLoading) setMessagesLoading(false);
    }
  };

  // Send message via API
  const sendMessage = async (chatId: string, sessionId: string, text: string) => {
    try {
      setSendingMessage(true);
      
      const requestBody = {
        chatId: chatId,
        reply_to: null,
        text: text,
        linkPreview: true,
        linkPreviewHighQuality: false,
        session: sessionId
      };
      
      console.log('Sending message with payload:', requestBody);
      
      const response = await authenticatedFetch('/send-text/', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Send message error:', response.status, errorText);
        throw new Error(`Mesaj gönderilemedi: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Send message success:', result);
      
      // Mesajı store'a manuel ekleme yapmıyoruz - backend'den gelecek
      
      // Mesaj gönderildikten sonra son 10 mesajı tekrar çek
      if (selectedContactData) {
        setTimeout(() => {
          fetchMessages(selectedContactData.sessionId, selectedContactData.rawChatId, selectedContactData.id, 10, false);
        }, 500); // 500ms bekle, backend'in işlemesi için
      }
      
      // Overview'ı da güncelle (kendi mesajımız için)
      const currentSession = sessions.find(s => s.name === sessionId);
      if (currentSession) {
        const overviewUpdate = {
          id: chatId,
          name: null, // Mevcut name korunacak
          lastMessage: {
            id: result.id || `sent_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000),
            from: currentSession.me?.id || '',
            fromMe: true,
            source: sessionId,
            body: text,
            to: chatId,
            participant: null,
            hasMedia: false,
            media: null,
            ack: 1,
            ackName: 'sent',
            replyTo: null,
            _data: result
          }
        };
        
        // Store'da overview'ı güncelle
        const { overviews } = useSessionStore.getState();
        if (overviews[sessionId]) {
          const updatedOverviews = [...overviews[sessionId]];
          const existingIndex = updatedOverviews.findIndex(c => c.id === chatId);
          
          if (existingIndex !== -1) {
            // Mevcut chat'i güncelle ve en üste taşı
            const existingChat = updatedOverviews[existingIndex];
            const updatedChat = {
              ...existingChat,
              lastMessage: overviewUpdate.lastMessage
            };
            
            updatedOverviews.splice(existingIndex, 1);
            updatedOverviews.unshift(updatedChat);
            
            useSessionStore.setState({
              overviews: {
                ...overviews,
                [sessionId]: updatedOverviews
              }
            });
          }
        }
      }
      
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
        // Mesaj offset'ini sıfırla
        setMessagesOffset(0);
        setHasMoreMessages(true);
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
    setCurrentOffset(0);
    setHasMore(true);
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contact.phone.includes(searchQuery);
    
    switch (filterType) {
      case 'unread':
        // fromMe: false ve ack: 1 olan mesajlar (okunmamış)
        return matchesSearch && (contact.lastMessageAck === 1) && typeof contact.lastMessageId === 'string' && contact.lastMessageId.startsWith('false');
      case 'pinned':
        return matchesSearch && contact.isPinned;
      case 'archived':
        return matchesSearch && contact.isArchived;
      default:
        return matchesSearch && !contact.isArchived;
    }
  });

  const selectedContactData = contacts.find(c => c.id === selectedContact);
  const contactMessages = messages
    .filter(m => m.contactId === selectedContact)
    .sort((a, b) => {
      // rawTimestamp varsa onu kullan, yoksa timestamp string'ini parse et
      // En yeniden en eskiye doğru sırala (WhatsApp gibi)
      const timeA = a.rawTimestamp || new Date(a.timestamp).getTime();
      const timeB = b.rawTimestamp || new Date(b.timestamp).getTime();
      return timeA - timeB; // En eski en üstte, en yeni en altta
    });

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedContactData || sendingMessage) {
      return;
    }

    try {
      // Mesaj gönderildiğinde typing'i durdur
      stopTyping();
      setHasStartedTyping(false);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
      
      await sendMessage(selectedContactData.rawChatId, selectedContactData.sessionId, messageInput);
      setMessageInput('');
      
      // Mesaj gönderildikten sonra en alta scroll et
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
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

  // Component unmount olduğunda cleanup
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  // Scroll event handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const threshold = 100; // 100px kala yükle
    
    if (scrollHeight - scrollTop - clientHeight < threshold && 
        !loadingMore && 
        hasMore && 
        selectedSession !== 'ALL') {
      loadMoreContacts();
    }
  };

  // Daha fazla contact yükle
  const loadMoreContacts = async () => {
    if (loadingMore || !hasMore || selectedSession === 'ALL') return;
    
    setLoadingMore(true);
    try {
      const newOffset = currentOffset + 50;
      const data = await fetchOverviewForce(selectedSession, 50, newOffset);
      
      if (data && data.length > 0) {
        const newContacts = formatContacts(data, selectedSession);
        
        // Yeni gelen contact'ları mevcut liste ile birleştir
        setContacts(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const uniqueNewContacts = newContacts.filter(c => !existingIds.has(c.id));
          return [...prev, ...uniqueNewContacts];
        });
        
        setCurrentOffset(newOffset);
        setHasMore(data.length === 50); // 50'den az gelirse daha fazla yok
        console.log(`Loaded ${data.length} more contacts, total: ${contacts.length + data.length}`);
      } else {
        setHasMore(false);
        console.log('No more contacts to load');
      }
    } catch (error) {
      console.error('Error loading more contacts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Mesajlar için scroll handler
  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    const threshold = 200; // 200px kala yükle
    
    if (scrollTop < threshold && 
        !loadingMoreMessages && 
        hasMoreMessages && 
        selectedContactData) {
      loadMoreMessages();
    }
  };

  // Mesajları okundu olarak işaretle
  const markMessagesAsSeen = async (messageIds: string[]) => {
    if (!selectedContactData || messageIds.length === 0) return;
    
    try {
      await authenticatedFetch('/send-seen', {
        method: 'POST',
        body: JSON.stringify({
          chatId: selectedContactData.rawChatId,
          messageIds: messageIds,
          participant: null,
          session: selectedContactData.sessionId
        })
      });
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  };

  // Yazıyor durumunu başlat
  const startTyping = async () => {
    if (!selectedContactData || isTyping) return;
    
    try {
      await authenticatedFetch('/start-typing', {
        method: 'POST',
        body: JSON.stringify({
          chatId: selectedContactData.rawChatId,
          messageIds: [],
          participant: null,
          session: selectedContactData.sessionId
        })
      });
      setIsTyping(true);
    } catch (error) {
      console.error('Error starting typing:', error);
    }
  };

  // Yazıyor durumunu durdur
  const stopTyping = async () => {
    if (!selectedContactData || !isTyping) return;
    
    try {
      await authenticatedFetch('/stop-typing', {
        method: 'POST',
        body: JSON.stringify({
          chatId: selectedContactData.rawChatId,
          messageIds: [],
          participant: null,
          session: selectedContactData.sessionId
        })
      });
      setIsTyping(false);
    } catch (error) {
      console.error('Error stopping typing:', error);
    }
  };

  // Daha fazla mesaj yükle
  const loadMoreMessages = async () => {
    if (loadingMoreMessages || !hasMoreMessages || !selectedContactData) return;
    
    setLoadingMoreMessages(true);
    try {
      const newOffset = messagesOffset + 50;
      const response = await authenticatedFetch(`/chats/${selectedContactData.sessionId}/${selectedContactData.rawChatId}/messages?limit=50&offset=${newOffset}`);
      
      if (!response.ok) throw new Error('Mesajlar alınamadı');
      
      const apiMessages: APIMessage[] = await response.json();
      
      if (apiMessages && apiMessages.length > 0) {
        // Mevcut scroll pozisyonunu kaydet
        const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
        const scrollHeightBefore = messagesContainer?.scrollHeight || 0;
        
        // Store'a mesajları ekle
        apiMessages.forEach(msg => {
          addMessage(selectedContactData.rawChatId, msg);
        });
        
        // Yeni mesajlar yüklendikten sonra scroll pozisyonunu ayarla
        setTimeout(() => {
          if (messagesContainer) {
            const scrollHeightAfter = messagesContainer.scrollHeight;
            const scrollDiff = scrollHeightAfter - scrollHeightBefore;
            messagesContainer.scrollTop = scrollDiff;
          }
        }, 100);
        
        setMessagesOffset(newOffset);
        setHasMoreMessages(apiMessages.length === 50); // 50'den az gelirse daha fazla yok
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  // Mesajlar veya seçili chat değiştiğinde scroll'u en alta al
  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container') as HTMLElement;
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages, selectedContact]);

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
              { key: 'unread', label: 'Okunmamış', count: contacts.filter(c => (c.lastMessageAck === 1) && typeof c.lastMessageId === 'string' && c.lastMessageId.startsWith('false')).length },
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
          <div className="flex-1 overflow-y-auto bg-gray-50" onScroll={handleScroll}>
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
                          <div className="absolute -top-1 -right-1 h-6 px-2 bg-[#25D366] text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                            Yeni
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
                
                {/* Loading More Indicator */}
                {loadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">Daha fazla yükleniyor...</span>
                  </div>
                )}
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white messages-container" onScroll={handleMessagesScroll}>
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
                <>
                  {/* Loading More Messages Indicator */}
                  {loadingMoreMessages && (
                    <div className="flex justify-center py-4">
                      <div className="flex items-center space-x-3 text-gray-500">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span className="font-medium">Eski mesajlar yükleniyor...</span>
                      </div>
                    </div>
                  )}
                  
                  {contactMessages.map((message) => (
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
                ))}
                </>
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
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      
                      // İlk karakter yazıldığında typing başlat
                      if (!hasStartedTyping && e.target.value.trim()) {
                        startTyping();
                        setHasStartedTyping(true);
                      }
                      
                      // Önceki timeout'u temizle
                      if (typingTimeout) {
                        clearTimeout(typingTimeout);
                      }
                      
                      // 3 saniye sonra yazıyor durumunu durdur (sadece mesaj boşsa)
                      if (e.target.value.trim()) {
                        const timeout = setTimeout(() => {
                          if (messageInput.trim()) {
                            stopTyping();
                            setHasStartedTyping(false);
                          }
                        }, 3000);
                        setTypingTimeout(timeout);
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    onFocus={() => {
                      // Focus'ta typing başlatma, sadece yazmaya başladığında
                    }}
                    onBlur={() => {
                      // Blur'da typing durdurma, sadece timeout veya gönder tuşunda
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