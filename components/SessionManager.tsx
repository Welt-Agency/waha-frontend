'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/hooks/useSessionStore';
import SessionCard from './SessionCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth';
import QRCodeModal from './QRCodeModal';

export default function SessionManager() {
  const sessions = useSessionStore(state => state.sessions);
  const loading = useSessionStore(state => state.loading);
  const error = useSessionStore(state => state.error);
  const fetchSessions = useSessionStore(state => state.fetchSessions);
  const subscribeToSessionStatus = useSessionStore(state => state.subscribeToSessionStatus);
  const subscribeToChatOverview = useSessionStore(state => state.subscribeToChatOverview);

  // QR modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);
  // WebSocket subscribe sadece bir kere çağrılsın
  const [websocketStarted, setWebsocketStarted] = useState(false);

  useEffect(() => {
    if (sessions.length === 0) {
      fetchSessions();
    }
  }, [sessions.length, fetchSessions]);

  useEffect(() => {
    if (!loading && sessions.length > 0 && !websocketStarted) {
      console.log('Starting websockets for sessions:', sessions.map(s => s.name));
      subscribeToSessionStatus();
      subscribeToChatOverview();
      setWebsocketStarted(true);
    }
  }, [loading, sessions, subscribeToSessionStatus, subscribeToChatOverview, websocketStarted]);

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

  if (loading) {
    return <div className="h-full flex items-center justify-center">Yükleniyor...</div>;
  }
  if (error) {
    return <div className="h-full flex items-center justify-center text-red-500">{error}</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Session Manager</h1>
        <Button className="bg-[#075E54] hover:bg-[#064e44] text-white">
          <Plus className="h-5 w-5 mr-2" />Yeni WhatsApp Numarası Ekle
        </Button>
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