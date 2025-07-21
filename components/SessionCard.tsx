import { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Smartphone, MoreHorizontal, RotateCcw, AlertCircle, Signal, SignalLow, Plus } from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth';

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

interface Session {
  id: string;
  phoneNumber: string;
  label: string;
  status: 'connected' | 'disconnected' | 'expired' | 'stopped' | 'failed';
  lastActivity: string;
  messagesCount: number;
  originalData?: APISession;
}

interface SessionCardProps {
  sessionId: string;
  sessionData?: APISession; // Optional prop for session data from parent
  onRemove: (sessionId: string) => void;
  onRestart: (sessionId: string) => void;
  onReconnect: (sessionId: string) => void;
  onStop: (sessionId: string) => void;
  onLogout: (sessionId: string) => void;
}

export default function SessionCard({ sessionId, sessionData, onRemove, onRestart, onReconnect, onStop, onLogout }: SessionCardProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Session'ı fetch et (sadece sessionData yoksa)
  const fetchSession = async () => {
    if (sessionData) return; // Eğer sessionData prop olarak geldiyse fetch etme
    
    try {
      setLoading(true);
      const response = await authenticatedFetch(`/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Session alınamadı');
      const apiSession: APISession = await response.json();
      const mapped: Session = mapApiSession(apiSession);
      setSession(mapped);
    } catch (err) {
      // Hata olursa session'ı null yapma, sadece loading'i kapat
    } finally {
      setLoading(false);
    }
  };

  // sessionData prop'u değiştiğinde session'ı güncelle
  useEffect(() => {
    if (sessionData) {
      const mapped: Session = mapApiSession(sessionData);
      setSession(mapped);
      setLoading(false);
    } else {
      fetchSession();
    }
  }, [sessionData, sessionId]);

  // Aksiyonlardan sonra session'ı hemen fetch et, restart için gecikmeli
  const handleAndFetch = async (fn: () => void | Promise<void>, delayMs?: number) => {
    await fn();
    // Eğer sessionData prop olarak geliyorsa fetch etmeye gerek yok
    if (!sessionData) {
      if (delayMs) {
        setTimeout(() => {
          fetchSession();
        }, delayMs);
      } else {
        fetchSession();
      }
    }
  };

  if (loading && !session) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-[#075E54] p-2 rounded-lg">
                <Smartphone className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg bg-gray-200 w-32 h-4 rounded" />
                <CardDescription className="text-sm bg-gray-100 w-24 h-3 rounded mt-2" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-gray-300" />
                <Badge className="bg-gray-100 text-gray-400">Yükleniyor...</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!session) return null;

  // Status helpers
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Signal className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <SignalLow className="h-4 w-4 text-yellow-600" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'stopped':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-pink-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'disconnected':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'stopped':
        return 'bg-orange-100 text-orange-800';
      case 'failed':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  function mapApiSession(apiSession: APISession): Session {
    if (apiSession.me && apiSession.me.id) {
      return {
        id: apiSession.name,
        phoneNumber: apiSession.me.id.replace('@c.us', ''),
        label: apiSession.me.pushName || apiSession.name,
        status: apiSession.status === 'WORKING' ? 'connected' :
                apiSession.status === 'STOPPED' ? 'stopped' :
                apiSession.status === 'FAILED' ? 'failed' :
                apiSession.status === 'STARTING' ? 'disconnected' :
                'disconnected',
        lastActivity: 'Bugün',
        messagesCount: Math.floor(Math.random() * 1000),
        originalData: apiSession
      };
    } else {
      return {
        id: apiSession.name,
        phoneNumber: 'Henüz bağlanmadı',
        label: apiSession.name,
        status: apiSession.status === 'SCAN_QR_CODE' ? 'disconnected' : 
               apiSession.status === 'STARTING' ? 'disconnected' :
               apiSession.status === 'STOPPED' ? 'stopped' :
               apiSession.status === 'FAILED' ? 'failed' :
               'expired',
        lastActivity: apiSession.status === 'STARTING' ? 'Başlatılıyor...' : 'Bağlantı bekleniyor',
        messagesCount: 0,
        originalData: apiSession
      };
    }
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-[#075E54] p-2 rounded-lg">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {session.phoneNumber === 'Henüz bağlanmadı' ? session.label : `+${session.phoneNumber}`}
              </CardTitle>
              <CardDescription className="text-sm">
                {session.phoneNumber === 'Henüz bağlanmadı' ? 'Bağlantı bekleniyor' : session.label}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {session.originalData?.status === 'WORKING' ? (
                <>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onStop(session.id))}>
                    Durdur
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onLogout(session.id))}>
                    Çıkış Yap
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onRestart(session.id), 3000)}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Yeniden Başlat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onRemove(session.id))} className="text-red-600">
                    Kaldır
                  </DropdownMenuItem>
                </>
              ) : session.originalData?.status === 'STOPPED' ? (
                <>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onRestart(session.id))}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Yeniden Başlat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onRemove(session.id))} className="text-red-600">
                    Kaldır
                  </DropdownMenuItem>
                </>
              ) : session.originalData?.status === 'STARTING' ? (
                <>
                  <DropdownMenuItem disabled>
                    Başlatılıyor...
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onStop(session.id))}>
                    Durdur
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onRemove(session.id))} className="text-red-600">
                    Kaldır
                  </DropdownMenuItem>
                </>
              ) : session.originalData?.status === 'SCAN_QR_CODE' ? (
                <>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onReconnect(session.id))}>
                    QR ile Bağlan
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onRestart(session.id))}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Yeniden Başlat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onRemove(session.id))} className="text-red-600">
                    Kaldır
                  </DropdownMenuItem>
                </>
              ) : session.originalData?.status === 'FAILED' ? (
                <>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onRestart(session.id), 3000)}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Yeniden Başlat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onLogout(session.id))}>
                    Çıkış Yap ve Yeniden Başlat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onRemove(session.id))} className="text-red-600">
                    Kaldır
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onRestart(session.id), 3000)}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Yeniden Başlat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAndFetch(() => onRemove(session.id))} className="text-red-600">
                    Kaldır
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(session.status)}
              <Badge className={getStatusColor(session.status)}>
                {session.originalData?.status === 'WORKING' ? 'Bağlı' : 
                 session.originalData?.status === 'STOPPED' ? 'Durduruldu' :
                 session.originalData?.status === 'STARTING' ? 'Başlatılıyor' :
                 session.originalData?.status === 'SCAN_QR_CODE' ? 'QR Bekliyor' :
                 session.originalData?.status === 'FAILED' ? 'Hata' :
                 session.status === 'connected' ? 'Bağlı' : 
                 session.status === 'disconnected' ? 'Bağlantı Kesildi' : 
                 session.status === 'stopped' ? 'Durduruldu' :
                 session.status === 'failed' ? 'Hata' :
                 'Süresi Doldu'}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Son Aktivite</span>
              <span className="font-medium">{session.lastActivity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Gönderilen Mesaj</span>
              <span className="font-medium">{session.messagesCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
            </div>
            {session.originalData?.me?.pushName && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Profil Adı</span>
                <span className="font-medium">{session.originalData.me.pushName}</span>
              </div>
            )}
            {session.originalData?.status && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">API Durumu</span>
                <span className="font-medium text-xs bg-gray-100 px-2 py-1 rounded">
                  {session.originalData.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 