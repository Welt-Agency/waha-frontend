'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, RefreshCw, Clock, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth';
import { useSessionStore } from '@/hooks/useSessionStore';

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionAdded: (session: any) => void;
  existingSessionId?: string; // Mevcut session'a bağlanmak için
}

interface SessionStatus {
  name: string;
  status: 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'STOPPED';
  config: any;
  me?: {
    id: string;
    pushName: string;
    jid: string;
  };
  engine?: any;
}

export default function QRCodeModal({ open, onOpenChange, onSessionAdded, existingSessionId }: QRCodeModalProps) {
  const [step, setStep] = useState<'label' | 'qr' | 'connecting' | 'success' | 'error'>('label');
  const [sessionLabel, setSessionLabel] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const qrRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  const session = useSessionStore(state =>
    existingSessionId ? state.sessions.find(s => s.name === existingSessionId) : undefined
  );

  // Modal açılırken mevcut session varsa direkt QR'a geç
  useEffect(() => {
    if (open && existingSessionId) {
      setSessionName(existingSessionId);
      setStep('qr');
      connectToExistingSession();
    } else if (open && !existingSessionId) {
      setStep('label');
    }
  }, [open, existingSessionId]);

  // Mevcut session'a bağlan
  const connectToExistingSession = async () => {
    if (!existingSessionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // QR kod al
      await fetchQRCode(existingSessionId);
      setTimeLeft(120);
      
      // Status kontrolünü başlat
      startStatusChecking(existingSessionId);
      
    } catch (err) {
      console.error('Error connecting to existing session:', err);
      setError('Mevcut session\'a bağlanılamadı');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new session and generate QR code
  const createSessionAndGenerateQR = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Kullanıcıdan alınan label'ı session adı olarak kullan
      const trimmedLabel = sessionLabel.trim();
      if (!trimmedLabel) throw new Error('Session adı boş olamaz');
      setSessionName(trimmedLabel);

      // Create new session
      const sessionResponse = await authenticatedFetch('/sessions/', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedLabel, // Artık kullanıcıdan alınan isim
          start: true,
          config: {
            metadata: {
            
            },
            proxy: null,
            debug: false,
            noweb: {
              store: {
                enabled: true,
                fullSync: false
              }
            },
            webhooks: []
          }
        })
      });

      if (!sessionResponse.ok) {
        throw new Error('Session oluşturulamadı');
      }

      const sessionData: SessionStatus = await sessionResponse.json();
      setSessionStatus(sessionData);

      // Wait a bit for session to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get QR code
      await fetchQRCode(trimmedLabel);
      
      setStep('qr');
      setTimeLeft(120);
      
      // Start checking session status
      startStatusChecking(trimmedLabel);
      
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch QR code from API
  const fetchQRCode = async (sessionName: string) => {
    try {
      const qrResponse = await authenticatedFetch(`/sessions/${sessionName}/get-qr-code`, {
        method: 'GET',
      });

      if (!qrResponse.ok) {
        throw new Error('QR kod alınamadı');
      }

      // Convert response to blob and create URL
      const blob = await qrResponse.blob();
      const qrUrl = URL.createObjectURL(blob);
      setQrCodeUrl(qrUrl);
      
    } catch (err) {
      console.error('Error fetching QR code:', err);
      setError('QR kod alınamadı');
    }
  };

  // Check session status periodically
  const startStatusChecking = (sessionName: string) => {
    statusCheckInterval.current = setInterval(async () => {
      try {
        const response = await authenticatedFetch(`/sessions/${sessionName}`);

        if (!response.ok) {
          throw new Error('Session durumu alınamadı');
        }

        const status: SessionStatus = await response.json();
        setSessionStatus(status);

        if (status.status === 'WORKING' && status.me) {
          // Session successfully connected
          setStep('connecting');
          setTimeout(() => {
            setStep('success');
            const newSession = {
              id: status.name,
              name: status.name,
              phoneNumber: status.me!.id.replace('@c.us', ''),
              label: sessionLabel,
              status: 'connected' as const,
              lastActivity: 'Şimdi',
              messagesCount: 0,
              pushName: status.me!.pushName
            };
            
            setTimeout(() => {
              onSessionAdded(newSession);
              resetModal();
            }, 2000);
          }, 2000);
          
          // Stop status checking
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
            statusCheckInterval.current = null;
          }
        } else if (status.status === 'FAILED') {
          setError('Session bağlantısı başarısız');
          setStep('error');
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
            statusCheckInterval.current = null;
          }
        }
      } catch (err) {
        console.error('Error checking session status:', err);
      }
    }, 10000); // Check every 10 seconds
  };

  // Countdown timer for QR expiry
  useEffect(() => {
    if (step === 'qr' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // QR expired, refresh it
            refreshQRCode();
            return 120;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  // Auto refresh QR code every 2 minutes
  useEffect(() => {
    if (step === 'qr' && sessionName) {
      qrRefreshInterval.current = setInterval(() => {
        refreshQRCode();
      }, 120000); // 2 minutes

      return () => {
        if (qrRefreshInterval.current) {
          clearInterval(qrRefreshInterval.current);
        }
      };
    }
  }, [step, sessionName]);

  // WebSocket ile status değişimini dinle
  useEffect(() => {
    if (session && session.status === 'WORKING') {
      // Modalı kapat ve success işlemi yap
      if (onSessionAdded) onSessionAdded(session);
      if (onOpenChange) onOpenChange(false);
    }
  }, [session, onSessionAdded, onOpenChange]);

  const refreshQRCode = async () => {
    if (sessionName) {
      setIsLoading(true);
      await fetchQRCode(sessionName);
      setTimeLeft(120);
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setStep('label');
    setSessionLabel('');
    setSessionName('');
    setQrCodeUrl('');
    setTimeLeft(120);
    setIsLoading(false);
    setError(null);
    setSessionStatus(null);
    
    // Clean up intervals
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
      statusCheckInterval.current = null;
    }
    if (qrRefreshInterval.current) {
      clearInterval(qrRefreshInterval.current);
      qrRefreshInterval.current = null;
    }
    
    // Clean up blob URL
    if (qrCodeUrl) {
      URL.revokeObjectURL(qrCodeUrl);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetModal, 300);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = (status?: string) => {
    return status;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-[#075E54]" />
            <span>
              {existingSessionId ? 'Session\'a Bağlan' : 'WhatsApp Numarası Ekle'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {step === 'label' && "WhatsApp session'ınıza bir isim verin"}
            {step === 'qr' && (existingSessionId ? 
              "Mevcut session'a bağlanmak için QR kodu tarayın" : 
              "WhatsApp ile bağlanmak için QR kodu tarayın"
            )}
            {step === 'connecting' && "WhatsApp'ınız bağlanıyor..."}
            {step === 'success' && "Başarıyla bağlandı!"}
            {step === 'error' && "Bir hata oluştu"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'label' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Session Etiketi</Label>
                <Input
                  id="label"
                  placeholder="ör: Satış Ekibi, Müşteri Desteği"
                  value={sessionLabel}
                  onChange={(e) => setSessionLabel(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleClose}>
                  İptal
                </Button>
                <Button 
                  onClick={createSessionAndGenerateQR}
                  className="bg-[#075E54] hover:bg-[#064e44]"
                  disabled={!sessionLabel.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    'QR Kod Oluştur'
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'qr' && (
            <div className="text-center space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#075E54]"></div>
                  <p className="text-gray-600">QR kod yenileniyor...</p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    {qrCodeUrl ? (
                      <img 
                        src={qrCodeUrl} 
                        alt="WhatsApp QR Kodu" 
                        className="mx-auto rounded-lg shadow-sm"
                        width={200}
                        height={200}
                      />
                    ) : (
                      <div className="w-[200px] h-[200px] bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                        <QrCode className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(timeLeft)} içinde yenilenecek</span>
                    </div>
                    
                    {sessionStatus && (
                      <div className="flex items-center justify-center space-x-2 text-sm">
                        <span className="text-gray-600">Durum:</span>
                        <span className={`font-medium ${
                          sessionStatus.status === 'WORKING' ? 'text-green-600' :
                          sessionStatus.status === 'SCAN_QR_CODE' ? 'text-yellow-600' :
                          sessionStatus.status === 'FAILED' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {getStatusText(sessionStatus.status)}
                        </span>
                      </div>
                    )}
                    
                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                      <p className="font-medium">Talimatlar:</p>
                      <ol className="mt-2 space-y-1 text-left">
                        <li>1. Telefonunuzda WhatsApp'ı açın</li>
                        <li>2. Menü → Bağlı Cihazlar'a dokunun</li>
                        <li>3. "Cihaz Bağla"ya dokunun</li>
                        <li>4. Bu QR kodu tarayın</li>
                      </ol>
                    </div>
                  </div>

                  <div className="flex justify-center space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={refreshQRCode}
                      disabled={isLoading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      QR Yenile
                    </Button>
                    <Button variant="outline" onClick={handleClose}>
                      İptal
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 'connecting' && (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#075E54] mx-auto"></div>
              <div>
                <p className="font-medium text-gray-900">Bağlanıyor...</p>
                <p className="text-sm text-gray-600">Lütfen bağlantı kurulurken bekleyin</p>
                {sessionStatus && sessionStatus.me && (
                  <p className="text-sm text-green-600 mt-2">
                    +{sessionStatus.me.id.replace('@c.us', '')} bağlandı
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Başarıyla Bağlandı!</p>
                <p className="text-sm text-gray-600">WhatsApp session'ınız "{sessionLabel}" artık aktif</p>
                {sessionStatus && sessionStatus.me && (
                  <p className="text-sm text-gray-500 mt-1">
                    Numara: +{sessionStatus.me.id.replace('@c.us', '')}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-4">
              <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Hata Oluştu</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <div className="flex justify-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setStep('label');
                    setError(null);
                  }}
                >
                  Tekrar Dene
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  İptal
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}