import { create } from 'zustand';
import { authenticatedFetch } from '@/lib/auth';

export interface APISession {
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

export interface APIChatOverview {
  id: string;
  name: string | null;
  picture?: string | null;
  timestamp?: number;
  unreadCount?: number;
  lastMessage: any;
  _chat?: any;
}

export interface APIMessage {
  id: string;
  timestamp: number;
  from: string;
  fromMe: boolean;
  source: string;
  to: string;
  participant: string | null;
  body: string;
  hasMedia: boolean;
  media: any;
  ack: number;
  ackName: string;
  author: string;
  location: any;
  vCards: string[];
  _data: any;
  replyTo: any;
}

interface SessionCountInfo {
  session_limit: number;
  count: number;
}

interface SessionStoreState {
  sessions: APISession[];
  sessionCountInfo: SessionCountInfo | null;
  loading: boolean;
  error: string | null;
  overviews: { [sessionId: string]: APIChatOverview[] };
  messages: { [chatId: string]: APIMessage[] };
  websocket: WebSocket | null;
  chatWebsocket: WebSocket | null;
  lastFetchTime: number | null;
  initialized: boolean;
  websocketConnected: boolean;
  chatWebsocketConnected: boolean;
  fetchSessions: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  setSessions: (sessions: APISession[]) => void;
  setSessionCountInfo: (info: SessionCountInfo) => void;
  fetchOverview: (sessionId: string, limit?: number, offset?: number) => Promise<APIChatOverview[] | undefined>;
  prefetchAllOverviews: (excludeSessionId?: string) => Promise<void>;
  subscribeToSessionStatus: () => void;
  subscribeToChatOverview: () => void;
  updateOverview: (sessionId: string, chatOverview: APIChatOverview) => void;
  addMessage: (chatId: string, message: APIMessage) => void;
  updateMessageStatus: (chatId: string, messageId: string, ack: number) => void;
}

export const useSessionStore = create<SessionStoreState>((set, get) => {
  // Fetch in progress flag for each session
  const fetchingSessions = new Set<string>();
  return ({
    sessions: [],
    sessionCountInfo: null,
    loading: false,
    error: null,
    overviews: {},
    messages: {},
    websocket: null,
    chatWebsocket: null,
    lastFetchTime: null,
    initialized: false,
    websocketConnected: false,
    chatWebsocketConnected: false,
    fetchSessions: async () => {
      const { lastFetchTime } = get();
      const now = Date.now();
      const cacheDuration = 3600000; // 1 saat cache süresi (WebSocket'ler real-time güncellemeler sağlıyor)
      
      // Cache hala geçerliyse fetch yapma
      if (lastFetchTime && (now - lastFetchTime) < cacheDuration) {
        const remainingTime = Math.ceil((cacheDuration - (now - lastFetchTime)) / 1000);
        console.log(`Session cache hala geçerli (${Math.floor(remainingTime / 60)}dk ${remainingTime % 60}s kaldı), fetch atlanıyor. WebSocket'ler real-time güncellemeler sağlıyor.`);
        return;
      }
      
      console.log('Session verileri fetch ediliyor...');
      set({ loading: true, error: null });
      try {
        const sessionRes = await authenticatedFetch('/sessions/');
        const countRes = await authenticatedFetch('/company/session-counts');
        if (!sessionRes.ok) throw new Error('Session verileri alınamadı');
        if (!countRes.ok) throw new Error('Session limit verisi alınamadı');
        const sessions = await sessionRes.json();
        const sessionCountInfo = await countRes.json();
        set({ sessions, sessionCountInfo, loading: false, lastFetchTime: now, initialized: true });
        console.log(`${sessions.length} session başarıyla yüklendi`);
      } catch (e: any) {
        set({ error: e.message, loading: false });
      }
    },
    forceRefresh: async () => {
      console.log('Manuel session refresh başlatılıyor...');
      set({ loading: true, error: null });
      try {
        const sessionRes = await authenticatedFetch('/sessions/');
        const countRes = await authenticatedFetch('/company/session-counts');
        if (!sessionRes.ok) throw new Error('Session verileri alınamadı');
        if (!countRes.ok) throw new Error('Session limit verisi alınamadı');
        const sessions = await sessionRes.json();
        const sessionCountInfo = await countRes.json();
        set({ sessions, sessionCountInfo, loading: false, lastFetchTime: Date.now(), initialized: true });
        console.log(`${sessions.length} session manuel olarak yenilendi`);
      } catch (e: any) {
        set({ error: e.message, loading: false });
      }
    },
    setSessions: (sessions) => set({ sessions }),
    setSessionCountInfo: (info) => set({ sessionCountInfo: info }),
    fetchOverview: async (sessionId, limit: number = 25, offset: number = 0) => {
      const { overviews } = get();
      if (overviews[sessionId]) {
        return overviews[sessionId];
      }
      try {
        const res = await authenticatedFetch(`/chats/${sessionId}/overview?limit=${limit}&offset=${offset}`);
        if (!res.ok) throw new Error('Overview alınamadı');
        const data = await res.json();
        set({ overviews: { ...get().overviews, [sessionId]: data } });
        return data;
      } catch (e) {
        // Hata durumunda cache'e yazma
        return undefined;
      }
    },
    prefetchAllOverviews: async (excludeSessionId) => {
      const { sessions, overviews, fetchOverview } = get();
      const prefetch = async () => {
        for (const session of sessions) {
          if (session.name === excludeSessionId) continue;
          if (overviews[session.name]) continue;
          // Prefetch'i yavaşlatmak için küçük bir delay ekle (ör: 1sn)
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await fetchOverview(session.name, 25, 0); // İlk 50 chat'i al
        }
      };
      await prefetch();
    },
    subscribeToSessionStatus: () => {
      const { websocket } = get();
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log('Mevcut Session Status WebSocket kapatılıyor...');
        websocket.close();
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waha-backend.onrender.com/api/v1';
      const wsUrl = baseUrl.replace('http://', 'ws://')
      const ws = new WebSocket(`${wsUrl}/ws/session-status`);
      console.log('Session Status WebSocket açılıyor...');
      
      ws.onopen = () => {
        console.log('Session Status WebSocket bağlantısı açıldı');
        set({ websocketConnected: true });
        // Mevcut session'lara subscribe ol
        const sessions = get().sessions;
        sessions.forEach((session) => {
          ws.send(JSON.stringify({ action: 'subscribe', session: session.name }));
          console.log('Subscribed to session:', session.name);
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'session.status' && data.metadata) {
            // APISession objesi oluştur
            const session = {
              ...data.payload,
              me: data.me,
              config: {},
              assignedWorker: '',
              // Diğer alanlar backend'den geliyorsa ekle
            };
            let sessions = get().sessions;
            const idx = sessions.findIndex(s => s.name === session.name);
            if (idx !== -1) {
              // Sadece status 'WORKING' olduğunda backend'den fetch et, üst üste fetch'i engelle
              if (session.status === 'WORKING' && sessions[idx].status !== 'WORKING') {
                if (!fetchingSessions.has(session.name)) {
                  fetchingSessions.add(session.name);
                  authenticatedFetch(`/sessions/${session.name}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(fetched => {
                      if (fetched) {
                        sessions[idx] = { ...sessions[idx], ...fetched };
                        set({ sessions: [...sessions] });
                      }
                      fetchingSessions.delete(session.name);
                    });
                }
              } else {
                // Diğer durumlarda local birleştir
                const updated = { ...sessions[idx], ...session };
                sessions[idx] = updated;
                set({ sessions: [...sessions] });
              }
            } else {
              set({ sessions: [...sessions, session] });
            }
            return;
          }
          // Eski type/session formatı
          if (data.type && data.session) {
            const { type, session } = data;
            let sessions = get().sessions;
            if (type === 'added') {
              sessions = [...sessions, session];
            } else if (type === 'removed') {
              sessions = sessions.filter(s => s.name !== session.name);
            } else if (type === 'updated') {
              sessions = sessions.map(s => s.name === session.name ? session : s);
            }
            set({ sessions });
          }
        } catch (e) {
          // ignore parse errors
        }
      };
      
      ws.onerror = (e) => {
        console.error('Session Status WebSocket hatası:', e);
        set({ error: 'Session Status WebSocket bağlantı hatası', websocketConnected: false });
      };
      
      ws.onclose = () => {
        console.log('Session Status WebSocket bağlantısı kapandı');
        set({ websocketConnected: false });
      };
      
      set({ websocket: ws });
    },
    subscribeToChatOverview: () => {
      const { chatWebsocket } = get();
      if (chatWebsocket && chatWebsocket.readyState === WebSocket.OPEN) {
        console.log('Mevcut Chat Overview WebSocket kapatılıyor...');
        chatWebsocket.close();
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://waha-backend.onrender.com/api/v1';
      const wsUrl = baseUrl.replace('http://', 'ws://')
      const ws = new WebSocket(`${wsUrl}/ws/chat-overview`);
      console.log('Chat Overview WebSocket açılıyor...');
      
      ws.onopen = () => {
        console.log('Chat Overview WebSocket bağlantısı açıldı');
        set({ chatWebsocketConnected: true });
        // Mevcut session'lara subscribe ol
        const sessions = get().sessions;
        sessions.forEach((session) => {
          ws.send(JSON.stringify({ action: 'subscribe', session: session.name }));
          console.log('Subscribed to chat overview for session:', session.name);
        });
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Chat Overview WebSocket received:', data);
          console.log('Full WebSocket message data:', JSON.stringify(data, null, 2));
          
          // Chat overview güncellemeleri - tek bir chat'in overview'ı
          if (data.event === 'chat_overview_update' && data.session && data.payload) {
            const { session, payload } = data;
            const { overviews } = get();
            
            console.log('Chat overview update received for session:', session);
            console.log('Payload:', payload);
            
            // Yeni yapı: payload.chat_overview içinde tek bir chat overview'ı
            if (overviews[session] && payload.chat_overview) {
              const chatOverview = payload.chat_overview;
              let updatedOverviews = [...overviews[session]];
              const existingIndex = updatedOverviews.findIndex(c => c.id === chatOverview.id);
              
              console.log('Chat ID to update:', chatOverview.id);
              console.log('Existing chat index:', existingIndex);
              
              if (existingIndex !== -1) {
                // Mevcut chat'i güncelle ve en üste taşı
                // Picture'ı koru, sadece mesaj bilgilerini güncelle
                const existingChat = updatedOverviews[existingIndex];
                const updatedChat = {
                  ...existingChat, // Mevcut bilgileri koru (picture dahil)
                  name: chatOverview.name || existingChat.name, // Name'i güncelle
                  lastMessage: chatOverview.lastMessage, // Son mesajı güncelle
                  unreadCount: chatOverview.unreadCount, // Unread count'u güncelle
                  timestamp: chatOverview.timestamp // Timestamp'i güncelle
                };
                
                updatedOverviews[existingIndex] = updatedChat;
                const movedChat = updatedOverviews.splice(existingIndex, 1)[0];
                updatedOverviews.unshift(movedChat);
                console.log(`Updated existing chat: ${chatOverview.id} and moved to top (preserved picture)`);
                console.log('Preserved picture:', existingChat.picture);
                console.log('Updated name:', updatedChat.name);
                console.log('Updated lastMessage:', updatedChat.lastMessage.body);
              } else {
                // Yeni chat ekle (en üste)
                updatedOverviews.unshift(chatOverview);
                console.log(`Added new chat: ${chatOverview.id}`);
              }
              
              console.log('Updated overviews for session:', session, updatedOverviews.length);
              
              set({ 
                overviews: { 
                  ...overviews, 
                  [session]: updatedOverviews 
                } 
              });
            }
            return;
          }
          
          // Webhook message event'i - yeni mesaj geldiğinde
          if (data.event === 'message' && data.session && data.payload) {
            const { session, payload, me } = data;
            const { overviews, messages } = get();
            
            console.log('Socket message received with payload:', payload);
            console.log('Full socket data:', data);
            
            // Mesaj verilerini hazırla
            const message: APIMessage = {
              id: payload.id,
              timestamp: payload.timestamp,
              from: payload.from,
              fromMe: payload.fromMe,
              source: payload.source,
              to: payload.to,
              participant: null,
              body: payload.body,
              hasMedia: payload.hasMedia,
              media: payload.media,
              ack: payload.ack,
              ackName: payload.ackName,
              author: payload.from,
              location: null,
              vCards: payload.vCards || [],
              _data: payload._data,
              replyTo: null
            };
            
            // Chat ID'yi oluştur (fromMe'ye göre)
            const chatId = payload.fromMe ? payload.to : payload.from;
            
            // Message event'inde de overview güncellemesi olabilir
            // Eğer payload'da overview bilgisi varsa onu kullan
            const overviewData = data.overview || data.chat || payload.overview || payload.chat || 
                               (data.payload && data.payload.overview) || (data.payload && data.payload.chat);
            
            if (overviewData) {
              console.log('Overview data found in message payload:', overviewData);
              
              if (overviews[session]) {
                const updatedOverviews = [...overviews[session]];
                const existingIndex = updatedOverviews.findIndex(c => c.id === overviewData.id);
                
                console.log('Current overviews before update:', overviews[session]);
                console.log('Existing chat index:', existingIndex);
                console.log('Chat ID to update:', overviewData.id);
                
                if (existingIndex !== -1) {
                  // Mevcut chat'i güncelle ve en üste taşı
                  const updatedChat = { ...overviewData };
                  updatedOverviews.splice(existingIndex, 1);
                  updatedOverviews.unshift(updatedChat);
                  console.log('Updated existing chat and moved to top');
                } else {
                  // Yeni chat ekle
                  updatedOverviews.unshift(overviewData);
                  console.log('Added new chat to overviews');
                }
                
                const newOverviews = { 
                  ...overviews, 
                  [session]: updatedOverviews 
                };
                
                console.log('New overviews state:', newOverviews[session as keyof typeof newOverviews]);
                
                set({ overviews: newOverviews });
                console.log('Overview updated with socket data');
                
                // State'in gerçekten değişip değişmediğini kontrol et
                setTimeout(() => {
                  const currentState = get();
                  console.log('State after update - overviews keys:', Object.keys(currentState.overviews));
                  console.log('State after update - session overviews:', currentState.overviews[session as keyof typeof currentState.overviews]);
                }, 100);
              } else {
                console.log('No existing overviews for session:', session);
              }
            } else {
              console.log('No overview data found in message socket, using manual update');
              // Overview bilgisi yoksa manuel olarak güncelle
              if (overviews[session]) {
                const updatedOverviews = [...overviews[session]];
                const existingIndex = updatedOverviews.findIndex(c => c.id === chatId);
                
                if (existingIndex !== -1) {
                  // Chat'i en üste taşı ve son mesajı güncelle
                  const updatedChat = {
                    ...updatedOverviews[existingIndex],
                    lastMessage: {
                      id: payload.id,
                      timestamp: payload.timestamp,
                      from: payload.from,
                      fromMe: payload.fromMe,
                      source: payload.source,
                      body: payload.body,
                      to: payload.to,
                      participant: null,
                      hasMedia: payload.hasMedia,
                      media: payload.media,
                      ack: payload.ack,
                      ackName: payload.ackName,
                      replyTo: null,
                      _data: payload._data
                    }
                  };
                  updatedOverviews.splice(existingIndex, 1);
                  updatedOverviews.unshift(updatedChat);
                  
                  set({ 
                    overviews: { 
                      ...overviews, 
                      [session]: updatedOverviews 
                    } 
                  });
                } else {
                  // Yeni chat oluştur
                  const newChat: APIChatOverview = {
                    id: chatId,
                    name: null, // Backend'den gelecek
                    picture: null, // Backend'den gelecek
                    lastMessage: {
                      id: payload.id,
                      timestamp: payload.timestamp,
                      from: payload.from,
                      fromMe: payload.fromMe,
                      source: payload.source,
                      body: payload.body,
                      to: payload.to,
                      participant: null,
                      hasMedia: payload.hasMedia,
                      media: payload.media,
                      ack: payload.ack,
                      ackName: payload.ackName,
                      replyTo: null,
                      _data: payload._data
                    },
                    _chat: {
                      id: chatId,
                      name: null,
                      conversationTimestamp: payload.timestamp
                    }
                  };
                  
                  updatedOverviews.unshift(newChat);
                  set({ 
                    overviews: { 
                      ...overviews, 
                      [session]: updatedOverviews 
                    } 
                  });
                }
              }
            }
            
            // Mesajı store'a ekle
            const chatMessages = messages[chatId] || [];
            set({ 
              messages: { 
                ...messages, 
                [chatId]: [...chatMessages, message] 
              } 
            });
            
            console.log('Message processed:', { session, chatId, message });
            return;
          }
          
          // Mesaj durumu güncellemeleri
          if (data.event === 'message.status' && data.chatId && data.messageId && data.ack !== undefined) {
            const { messages } = get();
            const chatMessages = messages[data.chatId] || [];
            const messageIndex = chatMessages.findIndex(m => m.id === data.messageId);
            
            if (messageIndex !== -1) {
              const updatedMessages = [...chatMessages];
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                ack: data.ack
              };
              
              set({ 
                messages: { 
                  ...messages, 
                  [data.chatId]: updatedMessages 
                } 
              });
            }
            return;
          }
          
        } catch (e) {
          console.error('Chat Overview WebSocket parse error:', e);
        }
      };
      
      ws.onerror = (e) => {
        console.error('Chat Overview WebSocket hatası:', e);
        set({ error: 'Chat Overview WebSocket bağlantı hatası', chatWebsocketConnected: false });
      };
      
      ws.onclose = () => {
        console.log('Chat Overview WebSocket bağlantısı kapandı');
        set({ chatWebsocketConnected: false });
      };
      
      set({ chatWebsocket: ws });
    },
    updateOverview: (sessionId: string, chatOverview: APIChatOverview) => {
      const { overviews } = get();
      if (overviews[sessionId]) {
        const updatedOverviews = overviews[sessionId].map(chat => 
          chat.id === chatOverview.id ? chatOverview : chat
        );
        set({ 
          overviews: { 
            ...overviews, 
            [sessionId]: updatedOverviews 
          } 
        });
      }
    },
    addMessage: (chatId: string, message: APIMessage) => {
      const { messages } = get();
      const chatMessages = messages[chatId] || [];
      
      // Aynı ID'li mesaj var mı kontrol et
      const existingIndex = chatMessages.findIndex(m => m.id === message.id);
      
      if (existingIndex !== -1) {
        // Mevcut mesajı güncelle
        const updatedMessages = [...chatMessages];
        updatedMessages[existingIndex] = message;
        set({ 
          messages: { 
            ...messages, 
            [chatId]: updatedMessages 
          } 
        });
      } else {
        // Yeni mesaj ekle
        set({ 
          messages: { 
            ...messages, 
            [chatId]: [...chatMessages, message] 
          } 
        });
      }
    },
    updateMessageStatus: (chatId: string, messageId: string, ack: number) => {
      const { messages } = get();
      const chatMessages = messages[chatId] || [];
      const messageIndex = chatMessages.findIndex(m => m.id === messageId);
      
      if (messageIndex !== -1) {
        const updatedMessages = [...chatMessages];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          ack: ack
        };
        
        set({ 
          messages: { 
            ...messages, 
            [chatId]: updatedMessages 
          } 
        });
      }
    },
  });
}); 