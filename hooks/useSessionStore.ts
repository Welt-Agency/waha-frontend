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
  picture: string | null;
  lastMessage: any;
  _chat: any;
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
  fetchSessions: () => Promise<void>;
  setSessions: (sessions: APISession[]) => void;
  setSessionCountInfo: (info: SessionCountInfo) => void;
  fetchOverview: (sessionId: string) => Promise<APIChatOverview[] | undefined>;
  prefetchAllOverviews: (excludeSessionId?: string) => Promise<void>;
  subscribeToSessionStatus: () => void;
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
    fetchSessions: async () => {
      set({ loading: true, error: null });
      try {
        const sessionRes = await authenticatedFetch('/sessions/');
        const countRes = await authenticatedFetch('/company/session-counts');
        if (!sessionRes.ok) throw new Error('Session verileri alınamadı');
        if (!countRes.ok) throw new Error('Session limit verisi alınamadı');
        const sessions = await sessionRes.json();
        const sessionCountInfo = await countRes.json();
        set({ sessions, sessionCountInfo, loading: false });
      } catch (e: any) {
        set({ error: e.message, loading: false });
      }
    },
    setSessions: (sessions) => set({ sessions }),
    setSessionCountInfo: (info) => set({ sessionCountInfo: info }),
    fetchOverview: async (sessionId) => {
      const { overviews } = get();
      if (overviews[sessionId]) {
        return overviews[sessionId];
      }
      try {
        const res = await authenticatedFetch(`/chats/${sessionId}/overview`);
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
          await fetchOverview(session.name);
        }
      };
      await prefetch();
    },
    subscribeToSessionStatus: () => {
      const ws = new WebSocket('ws://localhost:8001/api/v1/ws/session-status');
      console.log('WebSocket opened');
      ws.onopen = () => {
        console.log('WebSocket bağlantısı açıldı');
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
        set({ error: 'WebSocket bağlantı hatası' });
      };
      ws.onclose = () => {
        // İsteğe bağlı: Otomatik reconnect veya kullanıcıya bilgi verilebilir
      };
    },
  });
}); 