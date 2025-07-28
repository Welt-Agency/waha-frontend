'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/hooks/useSessionStore';
import SessionCard from './SessionCard';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth';
import QRCodeModal from './QRCodeModal';

export default function SessionManager() {
  const sessions = useSessionStore(state => state.sessions);
  const loading = useSessionStore(state => state.loading);
  const error = useSessionStore(state => state.error);
  const lastFetchTime = useSessionStore(state => state.lastFetchTime);
  const initialized = useSessionStore(state => state.initialized);
  const websocketConnected = useSessionStore(state => state.websocketConnected);
  const chatWebsocketConnected = useSessionStore(state => state.chatWebsocketConnected);
  const fetchSessions = useSessionStore(state => state.fetchSessions);
  const forceRefresh = useSessionStore(state => state.forceRefresh);
  const subscribeToSessionStatus = useSessionStore(state => state.subscribeToSessionStatus);
  const subscribeToChatOverview = useSessionStore(state => state.subscribeToChatOverview);

  // QR modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);
  // WebSocket subscribe sadece bir kere çağrılsın
  const [websocketStarted, setWebsocketStarted] = useState(false);

  // Manuel refresh fonksiyonu
  const handleManualRefresh = () => {
    forceRefresh();
  };

  // Cache durumu helper fonksiyonu
  const getCacheStatus = () => {
    if (!lastFetchTime) return null;
    const now = Date.now();
    const cacheDuration = 3600000; // 1 saat
    const timeDiff = now - lastFetchTime;
    const remainingMinutes = Math.floor((cacheDuration - timeDiff) / 60000);
    const remainingSeconds = Math.ceil(((cacheDuration - timeDiff) % 60000) / 1000);
    
    if (timeDiff < cacheDuration) {
      return `Cache aktif (${remainingMinutes}dk ${remainingSeconds}s kaldı)`;
    }
    return 'Cache süresi dolmuş';
  };

  useEffect(() => {
    // Session'lar zaten yüklüyse fetch yapma
    if (!initialized && sessions.length === 0 && !loading) {
      fetchSessions();
    }
  }, [initialized, sessions.length, loading, fetchSessions]);

  useEffect(() => {
    if (!loading && sessions.length > 0 && !websocketStarted) {
      console.log('Starting websockets for sessions:', sessions.map(s => s.name));
      // WebSocket bağlantıları zaten açıksa tekrar açma
      if (!websocketConnected) {
        subscribeToSessionStatus();
      }
      if (!chatWebsocketConnected) {
        subscribeToChatOverview();
      }
      setWebsocketStarted(true);
    }
  }, [loading, sessions, subscribeToSessionStatus, subscribeToChatOverview, websocketStarted, websocketConnected, chatWebsocketConnected]);

  // Handler fonksiyonları
  const handleRemove = async (sessionId: string) => {
    await authenticatedFetch(`/sessions/${sessionId}`, { method: 'DELETE' });
    // fetchSessions() kaldırıldı
  };
  const handleRestart = async (sessionId: string) => {
    await authenticatedFetch(`/sessions/${sessionId}/restart`, { method: 'POST' });
    // fetchSessions() kaldırıldı
  };
  const handleReconnect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowQRModal(true);
  };
  const handleStop = async (sessionId: string) => {
    await authenticatedFetch(`/sessions/${sessionId}/stop`, { method: 'POST' });
    // fetchSessions() kaldırıldı
  };
  const handleLogout = async (sessionId: string) => {
    await authenticatedFetch(`/sessions/${sessionId}/logout`, { method: 'POST' });
    // fetchSessions() kaldırıldı
  };

  if (loading && !initialized) {
    return <div className="h-full flex items-center justify-center">Yükleniyor...</div>;
  }
  if (error) {
    return <div className="h-full flex items-center justify-center text-red-500">{error}</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Session Manager</h1>
          {lastFetchTime && (
            <div className="text-sm text-gray-500 mt-1">
              <p>Son güncelleme: {new Date(lastFetchTime).toLocaleTimeString('tr-TR')}</p>
              <p className="text-xs">{getCacheStatus()}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleManualRefresh}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button 
            onClick={() => {
              setSelectedSessionId(undefined);
              setShowQRModal(true);
            }}
            className="bg-[#075E54] hover:bg-[#064e44] text-white"
          >
            <Plus className="h-5 w-5 mr-2" />Yeni WhatsApp Numarası Ekle
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sessions.map(session => (
          <SessionCard
            key={session.name}
            sessionId={session.name}
            sessionData={session}
            onRemove={handleRemove}
            onRestart={handleRestart}
            onReconnect={handleReconnect}
            onStop={handleStop}
            onLogout={handleLogout}
          />
        ))}
      </div>
      {sessions.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">Henüz WhatsApp sessionu yok</div>
      )}
      {/* QR Code Modal */}
      <QRCodeModal
        open={showQRModal}
        onOpenChange={(open) => {
          setShowQRModal(open);
          if (!open) setSelectedSessionId(undefined);
        }}
        onSessionAdded={() => {
          fetchSessions();
          setShowQRModal(false);
          setSelectedSessionId(undefined);
        }}
        existingSessionId={selectedSessionId}
      />
    </div>
  );
}