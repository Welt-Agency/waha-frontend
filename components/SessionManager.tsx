'use client';

import { useEffect, useState } from 'react';
import { useSessionStore, isSessionWorking, isSessionFailed, isSessionStopped, isSessionStarting, isSessionWaitingForQR } from '@/hooks/useSessionStore';
import SessionCard from './SessionCard';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth';
import QRCodeModal from './QRCodeModal';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SessionManager() {
  const {
    sessions,
    loading,
    error,
    lastFetchTime,
    initialized,
    websocketConnected,
    chatWebsocketConnected,
    fetchSessions,
    forceRefresh,
    subscribeToSessionStatus,
    subscribeToChatOverview,
    sessionCountInfo,
  } = useSessionStore();
  
  // Session durumlarına göre filtreleme
  const workingSessions = sessions.filter(isSessionWorking);
  const failedSessions = sessions.filter(isSessionFailed);
  const stoppedSessions = sessions.filter(isSessionStopped);
  const startingSessions = sessions.filter(isSessionStarting);
  const qrWaitingSessions = sessions.filter(isSessionWaitingForQR);

  // Session kategorileri
  const sessionCategories = [
    {
      key: 'working',
      title: 'Çalışan Session\'lar',
      sessions: workingSessions,
      icon: '🟢',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Mesaj gönderebilir ve alabilir'
    },
    {
      key: 'failed',
      title: 'Hatalı Session\'lar',
      sessions: failedSessions,
      icon: '🔴',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Yeniden başlatılması gerekiyor'
    },
    {
      key: 'stopped',
      title: 'Durdurulmuş Session\'lar',
      sessions: stoppedSessions,
      icon: '🟡',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      description: 'Kullanmak için yeniden başlatın'
    },
    {
      key: 'starting',
      title: 'Başlatılıyor',
      sessions: startingSessions,
      icon: '🔵',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Session başlatılıyor, lütfen bekleyin'
    },
    {
      key: 'qr-waiting',
      title: 'QR Kod Bekliyor',
      sessions: qrWaitingSessions,
      icon: '🟣',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'WhatsApp\'tan QR kodu tarayın'
    }
  ];

  // QR modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined);
  // WebSocket subscribe sadece bir kere çağrılsın
  const [websocketStarted, setWebsocketStarted] = useState(false);
  const [sessionLoadingProgress, setSessionLoadingProgress] = useState({ loaded: 0, total: 0 });
  
  // Accordion state - hangi kategorilerin açık olduğunu takip et
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['working'])); // Varsayılan olarak çalışan session'lar açık

  // Manuel refresh fonksiyonu
  const handleManualRefresh = () => {
    setSessionLoadingProgress({ loaded: 0, total: sessions.length });
    forceRefresh();
  };

  // Session yükleme progress'ini güncelle
  useEffect(() => {
    if (sessions.length > 0) {
      setSessionLoadingProgress(prev => ({ ...prev, total: sessions.length }));
      // Session'lar yüklendiğinde progress'i tamamla
      if (!loading) {
        setSessionLoadingProgress(prev => ({ ...prev, loaded: sessions.length }));
      }
    }
  }, [sessions.length, loading]);

  // Loading durumunda progress'i sıfırla
  useEffect(() => {
    if (loading) {
      setSessionLoadingProgress({ loaded: 0, total: 0 });
    }
  }, [loading]);

  // Session'lar yüklendiğinde progress'i güncelle
  useEffect(() => {
    if (!loading && sessions.length > 0) {
      // Kısa bir gecikme ile progress'i tamamla
      setTimeout(() => {
        setSessionLoadingProgress(prev => ({ ...prev, loaded: sessions.length }));
      }, 500);
    }
  }, [loading, sessions.length]);

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

  // Accordion toggle fonksiyonu
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Manager</h1>
          
          {/* İstatistikler - Daha kompakt */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-1">
              <span className="text-gray-600">Toplam:</span>
              <span className="font-semibold text-gray-900">{sessions.length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-600 font-medium">{workingSessions.length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-red-600 font-medium">{failedSessions.length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-600 font-medium">{stoppedSessions.length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-blue-600 font-medium">{startingSessions.length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-purple-600 font-medium">{qrWaitingSessions.length}</span>
            </div>
            {sessionCountInfo && (
              <div className="flex items-center space-x-1 ml-4 pl-4 border-l border-gray-300">
                <span className="text-gray-600">Limit:</span>
                <span className="font-semibold text-gray-900">{sessionCountInfo.count}/{sessionCountInfo.session_limit}</span>
              </div>
            )}
          </div>
          
          {/* Session durumu uyarıları */}
          {failedSessions.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 font-medium">Dikkat: {failedSessions.length} session hatası var!</span>
              </div>
              <p className="text-red-700 text-sm mt-1">
                Bu session'lar mesaj gönderemez ve alınamaz. Lütfen yeniden başlatın veya QR kod ile bağlanın.
              </p>
            </div>
          )}
          
          {stoppedSessions.length > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-800 font-medium">Bilgi: {stoppedSessions.length} session durdurulmuş</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                Bu session'lar mesaj gönderemez. Kullanmak için yeniden başlatın.
              </p>
            </div>
          )}
          
          {qrWaitingSessions.length > 0 && (
            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-purple-600" />
                <span className="text-purple-800 font-medium">QR Kod Bekliyor: {qrWaitingSessions.length} session</span>
              </div>
              <p className="text-purple-700 text-sm mt-1">
                Bu session'lar QR kod taraması bekliyor. WhatsApp'tan QR kodu tarayın.
              </p>
            </div>
          )}
          {loading && sessionLoadingProgress.total > 0 && (
            <div className="mt-2 p-2 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
                <span>Session'lar yükleniyor...</span>
                <span>{sessionLoadingProgress.loaded}/{sessionLoadingProgress.total}</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-1.5">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${(sessionLoadingProgress.loaded / sessionLoadingProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          {lastFetchTime && (
            <div className="text-xs text-gray-500 mt-2">
              <span>Son güncelleme: {new Date(lastFetchTime).toLocaleTimeString('tr-TR')}</span>
              <span className="mx-2">•</span>
              <span>{getCacheStatus()}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end space-y-3">
          {/* Üst satır - Ana butonlar - En sağa yapıştırılmış */}
          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleManualRefresh}
              variant="outline"
              disabled={loading}
              size="sm"
              className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
            <Button 
              onClick={() => {
                setSelectedSessionId(undefined);
                setShowQRModal(true);
              }}
              size="sm"
              className="bg-[#075E54] hover:bg-[#064e44] text-white shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Session
            </Button>
          </div>
          
          {/* Alt satır - Hızlı aksiyonlar - Sağa hizalanmış */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                // Tüm kategorileri aç
                setExpandedCategories(new Set(['working', 'failed', 'stopped', 'starting', 'qr-waiting']));
              }}
              className="text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              Tümünü Aç
            </Button>
            <span className="text-gray-300">|</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                // Sadece çalışan session'ları aç
                setExpandedCategories(new Set(['working']));
              }}
              className="text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              Sadece Çalışanlar
            </Button>
            <span className="text-gray-300">|</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                // Tüm kategorileri kapat
                setExpandedCategories(new Set());
              }}
              className="text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              Tümünü Kapat
            </Button>
          </div>
        </div>
      </div>
      {/* Session Kategorileri */}
      <div className="space-y-4">
        {loading && sessions.length === 0 ? (
          // Loading skeleton'ları göster
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-200 p-2 rounded-lg w-8 h-8"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          sessionCategories.map((category) => (
            <Card key={category.key} className={`${category.bgColor} ${category.borderColor} border-2`}>
              <CardHeader className="pb-3">
                <button
                  onClick={() => toggleCategory(category.key)}
                  className="flex items-center justify-between w-full text-left hover:bg-opacity-80 transition-colors rounded-lg p-2 -m-2"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <h3 className={`font-semibold ${category.color}`}>
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className={`${category.color} ${category.borderColor}`}>
                      {category.sessions.length} session
                    </Badge>
                    {expandedCategories.has(category.key) ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </button>
              </CardHeader>
              
              {expandedCategories.has(category.key) && category.sessions.length > 0 && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {category.sessions.map((session) => (
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
                </CardContent>
              )}
              
              {expandedCategories.has(category.key) && category.sessions.length === 0 && (
                <CardContent className="pt-0">
                  <div className="text-center py-8 text-gray-500">
                    <p>Bu kategoride session bulunmuyor</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
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