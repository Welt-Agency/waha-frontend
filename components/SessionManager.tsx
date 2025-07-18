'use client';

import { useState, useEffect } from 'react';
import { Plus, Smartphone, Signal, SignalLow, AlertCircle, MoreHorizontal, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import QRCodeModal from './QRCodeModal';
import { authenticatedFetch } from '@/lib/auth';
import SessionCard from './SessionCard';

interface APISession {
  name: string;
  status: string;
  config: any;
  me?: any;
  assignedWorker: string;
}

interface SessionIdOnly {
  id: string;
}

export default function SessionManager() {
  const [sessions, setSessions] = useState<APISession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);

  // API'den session id listesini çek
  const fetchSessionIds = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authenticatedFetch('/sessions');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const apiSessions: APISession[] = await response.json();
      setSessions(apiSessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionIds();
    const interval = setInterval(fetchSessionIds, 60000); // 60 saniye
    return () => clearInterval(interval);
  }, []);

  // Handler fonksiyonları SessionCard'a prop olarak geçilecek
  const handleRemove = async (sessionId: string) => {
    try {
      const response = await authenticatedFetch(`/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setSessions(sessions.filter(session => session.name !== sessionId));
      }
    } catch (err) {
      console.error('Error removing session:', err);
    }
  };
  const handleRestart = async (sessionId: string) => {
    try {
      await authenticatedFetch(`/sessions/${sessionId}/restart`, { method: 'POST' });
    } catch (err) {
      console.error('Error restarting session:', err);
    }
  };
  const handleReconnect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowQRModal(true);
  };
  const handleStop = async (sessionId: string) => {
    try {
      await authenticatedFetch(`/sessions/${sessionId}/stop`, { method: 'POST' });
    } catch (err) {
      console.error('Error stopping session:', err);
    }
  };
  const handleLogout = async (sessionId: string) => {
    try {
      await authenticatedFetch(`/sessions/${sessionId}/logout`, { method: 'POST' });
    } catch (err) {
      console.error('Error logging out session:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <span className="text-gray-600">Session bilgileri yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Bağlantı Hatası</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchSessionIds} className="bg-[#075E54] hover:bg-[#064e44]">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tekrar Dene
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Manager</h1>
              <p className="text-gray-600">WhatsApp iş numaralarınızı ve bağlantılarınızı yönetin</p>
            </div>
            <Button 
              onClick={fetchSessionIds}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Aktif Sessionlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {sessions.filter(s => s.status === 'WORKING').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pasif Sessionlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {sessions.filter(s => s.status !== 'WORKING').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add New Session Button */}
        <div className="mb-6">
          <Button 
            onClick={() => {
              setSelectedSessionId(undefined);
              setShowQRModal(true);
            }}
            className="bg-[#075E54] hover:bg-[#064e44] text-white"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Yeni WhatsApp Numarası Ekle
          </Button>
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <SessionCard
              key={session.name}
              sessionId={session.name}
              onRemove={handleRemove}
              onRestart={handleRestart}
              onReconnect={handleReconnect}
              onStop={handleStop}
              onLogout={handleLogout}
            />
          ))}
        </div>

        {/* Empty State */}
        {sessions.length === 0 && !loading && (
          <div className="text-center py-12">
            <Smartphone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz WhatsApp sessionu yok</h3>
            <p className="text-gray-600 mb-6">İlk WhatsApp iş numaranızı ekleyerek başlayın</p>
            <Button 
              onClick={() => {
                setSelectedSessionId(undefined);
                setShowQRModal(true);
              }}
              className="bg-[#075E54] hover:bg-[#064e44] text-white"
            >
              <Plus className="h-5 w-5 mr-2" />
              İlk Numaranızı Ekleyin
            </Button>
          </div>
        )}

        {/* QR Code Modal */}
        <QRCodeModal 
          open={showQRModal} 
          onOpenChange={(open) => {
            setShowQRModal(open);
            if (!open) {
              setSelectedSessionId(undefined);
            }
          }}
          onSessionAdded={(newSession) => {
            // Yeni session eklendikten sonra listeyi yenile
            fetchSessionIds();
            setShowQRModal(false);
            setSelectedSessionId(undefined);
          }}
          existingSessionId={selectedSessionId}
        />
      </div>
    </div>
  );
}