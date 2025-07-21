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
import { Dialog as AlertDialog, DialogContent as AlertDialogContent, DialogHeader as AlertDialogHeader, DialogTitle as AlertDialogTitle } from '@/components/ui/dialog';
import { LoginResponse } from '@/lib/auth';

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

interface SessionManagerProps {
  user: LoginResponse | null;
}

export default function SessionManager({ user }: SessionManagerProps) {
  const [sessions, setSessions] = useState<APISession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [sessionCountInfo, setSessionCountInfo] = useState<{ session_limit: number, count: number } | null>(null);
  const [startingSessions, setStartingSessions] = useState<Set<string>>(new Set());

  // API'den session id listesini çek
  const fetchSessionIds = async () => {
    try {
      setLoading(true);
      setError(null);
      let sessionRes: any = undefined, countRes: any = undefined, companyRes: any = undefined, userRes: any = undefined;
       if (user?.user_type === 'admin') {
        console.log('Admin ise tüm istekleri at');
        [sessionRes, countRes, companyRes, userRes] = await Promise.all([
          authenticatedFetch('/sessions'),
          authenticatedFetch('/company/session-counts'),
          authenticatedFetch('/company/me'),
          authenticatedFetch('/company/users')
        ]);
      } else {
        console.log('Normal user ise sadece session ve count istekleri at');
        [sessionRes, countRes] = await Promise.all([
          authenticatedFetch('/sessions'),
          authenticatedFetch('/company/session-counts')
        ]);
        companyRes = { ok: false };
        userRes = { ok: false };
      }
      if (!sessionRes.ok) throw new Error(`HTTP error! status: ${sessionRes.status}`);
      const apiSessions: APISession[] = await sessionRes.json();
      setSessions(apiSessions);
      
      // STARTING sessionları takip et
      const newStartingSessions = new Set<string>();
      apiSessions.forEach(session => {
        if (session.status === 'STARTING') {
          newStartingSessions.add(session.name);
        }
      });
      setStartingSessions(newStartingSessions);
      
      if (companyRes && companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData);
      }
      if (userRes && userRes.ok) {
        const usersData = await userRes.json();
        // User role zaten prop olarak geldiği için burada set etmeye gerek yok
      }
      if (countRes && countRes.ok) {
        const countData = await countRes.json();
        setSessionCountInfo(countData);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // STARTING sessionlar için hızlı polling (2 saniyede bir)
  useEffect(() => {
    if (startingSessions.size > 0) {
      const interval = setInterval(() => {
        fetchSessionIds();
      }, 2000); // 2 saniyede bir kontrol et
      
      return () => clearInterval(interval);
    }
  }, [startingSessions]);

  useEffect(() => {
    fetchSessionIds();
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

  // isSessionLimitReached'i güncelle:
  const isSessionLimitReached = !!sessionCountInfo && (
    (sessionCountInfo.count !== undefined && sessionCountInfo.session_limit !== undefined && sessionCountInfo.count >= sessionCountInfo.session_limit)
  );

  // Yeni WhatsApp Numarası Ekle butonu sadece QR modalı açacak:
  const handleAddSession = () => {
    setSessionError(null);
    setSelectedSessionId(undefined);
    setShowQRModal(true);
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
        <div className="mb-6 flex items-center space-x-3">
          <Button
            onClick={handleAddSession}
            className={`bg-[#075E54] hover:bg-[#064e44] text-white ${isSessionLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
            size="lg"
            disabled={isSessionLimitReached}
          >
            <Plus className="h-5 w-5 mr-2" />
            Yeni WhatsApp Numarası Ekle
          </Button>
          {isSessionLimitReached && (
            <div className="flex items-center space-x-2 text-red-600 text-sm">
              <AlertCircle className="h-5 w-5" />
              <span>
                {user?.user_type === 'admin'
                  ? 'Session limitine ulaşıldı'
                  : 'Session limitine ulaşıldı, lütfen admin ile konuşun'}
              </span>
            </div>
          )}
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sessions.map((session) => (
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

        {/* Empty State */}
        {sessions.length === 0 && !loading && (
          <div className="text-center py-12">
            <Smartphone className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz WhatsApp sessionu yok</h3>
            <p className="text-gray-600 mb-6">İlk WhatsApp iş numaranızı ekleyerek başlayın</p>
            <div className="flex items-center justify-center space-x-3">
              <Button
                onClick={handleAddSession}
                className={`bg-[#075E54] hover:bg-[#064e44] text-white ${isSessionLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isSessionLimitReached}
              >
                <Plus className="h-5 w-5 mr-2" />
                İlk Numaranızı Ekleyin
              </Button>
              {isSessionLimitReached && (
                <div className="flex items-center space-x-2 text-red-600 text-sm">
                  <AlertCircle className="h-5 w-5" />
                  <span>
                    {user?.user_type === 'admin'
                      ? 'Session limitine ulaşıldı'
                      : 'Session limitine ulaşıldı, lütfen admin ile konuşun'}
                  </span>
                </div>
              )}
            </div>
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

        {sessionError && (
          <div className="my-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {sessionError}
          </div>
        )}

        {/* UI'da sessionError varsa popup göster: */}
        <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Session Limiti Doldu</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="text-red-700 mb-2">{sessionError || 'Limit dolu, admin ile iletişime geçin.'}</div>
            <Button onClick={() => setShowErrorDialog(false)} className="bg-[#075E54] text-white mt-2">Tamam</Button>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}