'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Users, RefreshCw, AlertCircle, CheckCircle, Zap, RotateCcw, Clock, Info, Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authenticatedFetch } from '@/lib/auth';

interface Session {
  id: string;
  name: string;
  label: string;
  phone: string;
  status: string;
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

interface BulkMessageResult {
  phoneNumber: string;
  status: 'success' | 'error' | 'pending';
  message?: string;
  sessionUsed?: string;
  timestamp: string;
}

export default function BulkMessage() {
  const [phoneListText, setPhoneListText] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [useRotation, setUseRotation] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [messageDelaySeconds, setMessageDelaySeconds] = useState(1);
  const [jobId, setJobId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [jobFinished, setJobFinished] = useState(false);
  let lastResultLength = useRef<number>(0);

  // Kullanıcı sayısını hesapla (her satır bir kişi)
  const getUserCount = () => {
    return phoneListText.split('\n').filter(line => line.trim().length > 0).length;
  };

  // API'den session'ları çek
  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await authenticatedFetch('/sessions');
      if (!response.ok) throw new Error('Session verileri alınamadı');
      
      const apiSessions: APISession[] = await response.json();
      const formattedSessions: Session[] = apiSessions
        .filter(session => session.me && session.me.id && session.status === 'WORKING')
        .map((session, index) => ({
          id: session.name,
          name: session.name,
          label: session.me!.pushName || `Session ${index + 1}`,
          phone: session.me!.id.replace('@c.us', ''),
          status: session.status
        }));
      
      setSessions(formattedSessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);


  // Session seçimi handle et
  const handleSessionToggle = (sessionId: string) => {
    setSelectedSession(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  // Tüm session'ları seç/kaldır
  const handleSelectAllSessions = () => {
    if (selectedSession.length === sessions.length) {
      setSelectedSession([]);
    } else {
      setSelectedSession(sessions.map(s => s.id));
    }
  };

  // Toplu mesaj gönder
  const handleBulkSend = async () => {
    if (!messageContent.trim()) {
      alert('Lütfen mesaj içeriğini girin');
      return;
    }
    const userCount = getUserCount();
    if (userCount === 0) {
      alert('Lütfen en az bir kişi ekleyin');
      return;
    }
    if (selectedSession.length === 0) {
      alert('Lütfen en az bir session seçin');
      return;
    }
    setLoading(true);
    setResults(null);
    setJobId(null);
    setPolling(false);
    try {
      let payload: any = {
        phone_list_text: phoneListText,
        reply_to: null,
        text: messageContent,
        linkPreview: true,
        linkPreviewHighQuality: false,
        sessions: selectedSession,
        is_rotation_enabled: useRotation ? 'true' : 'false',
        is_ai_enabled: useAI ? 'true' : 'false',
        message_delay_seconds: messageDelaySeconds,
        background:true
      };
      const response = await authenticatedFetch('/send-text-multiple', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.job_id) {
        setJobId(data.job_id);
        setPolling(true);
        // setLoading(true); // loading zaten true
      } else {
        setResults({ ok: false, data: { message: data.message || 'Job başlatılamadı' } });
        setLoading(false);
      }
    } catch (error) {
      setResults({ ok: false, data: { message: 'Bağlantı hatası' } });
      setLoading(false);
    }
  };

  // Polling logic for job status
  useEffect(() => {
    if (jobId && polling) {
      const fetchJobStatus = async () => {
        try {
          const res = await authenticatedFetch(`/job-status/${jobId}`);
          const data = await res.json().catch(() => ({}));
          setResults({
            ok: data.status === 'completed',
            data: data.result || [],
            status: data.status,
            current_count: data.current_count,
            total_count: data.total_count,
            finished: data.finished,
          });
          if (data.finished) {
            setJobFinished(true);
            setPolling(false);
            setLoading(false);
            setJobId(null);
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
              pollingInterval.current = null;
            }
          }
        } catch (err) {
          setResults({ ok: false, data: { message: 'Job durumu alınamadı' } });
          setPolling(false);
          setLoading(false);
          setJobId(null);
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
          }
        }
      };
      fetchJobStatus();
      const intervalMs = Math.max(2000, Math.min(10000, messageDelaySeconds * 1000));
      pollingInterval.current = setInterval(fetchJobStatus, intervalMs);
      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
      };
    }
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [jobId, polling, messageDelaySeconds]);

  // Cancel job fonksiyonu
  const handleCancelJob = async () => {
    if (!jobId) return;
    setCancelling(true);
    try {
      await authenticatedFetch(`/job-cancel/${jobId}`, { method: 'POST' });
      setCancelled(true);
      setCancelling(false);
      // Polling devam edecek, sadece cancelled state güncellendi
    } catch (err) {
      setCancelling(false);
      // Hata mesajı gösterilebilir
    }
  };

  // Komponent unmount olursa polling'i temizle
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, []);

  // Gönderimi duraklat/devam ettir
  const togglePause = () => {
    // This function is no longer needed as rotation is removed
  };

  // Gönderimi durdur
  const stopSending = () => {
    // This function is no longer needed as rotation is removed
  };
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Toplu Mesaj Gönderimi</h1>
            <p className="text-gray-600">Birden fazla kişiye aynı anda mesaj gönderin</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={fetchSessions}
              variant="outline"
              size="sm"
              disabled={sessionsLoading}
            >
              {sessionsLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Yenile
            </Button>
            
            {/* Gönderim Kontrolleri */}
            {loading && (
              <div className="flex items-center space-x-2">
                <Button
                  onClick={togglePause}
                  variant="outline"
                  size="sm"
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  {/* This button is no longer needed as rotation is removed */}
                  <Play className="h-4 w-4 mr-2" />
                  Devam Et
                </Button>
                <Button
                  onClick={stopSending}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Durdur
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sol Panel - Mesaj Hazırlama */}
        <div className="xl:col-span-2 space-y-6">
          {/* Telefon Listesi */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-[#075E54]" />
                  <CardTitle>Telefon Listesi</CardTitle>
                </div>
                <Badge variant="outline" className="text-sm">
                  {getUserCount()} kişi
                </Badge>
              </div>
              <CardDescription>
                Her satıra bir kişi ekleyin: <br />
                <span className="font-mono text-xs">+905551234567\temrullah\ttilki</span> <br />
                (Numara, ad, soyad tab ile ayrılmış)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={'+905551234567\temrullah\ttilki\n+905551234568\tsinan\tçelikiz'}
                value={phoneListText}
                onChange={(e) => setPhoneListText(e.target.value)}
                className="min-h-[180px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Mesaj İçeriği */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-[#075E54]" />
                  <CardTitle>Mesaj İçeriği</CardTitle>
                </div>
                <Badge variant="outline" className="text-sm">
                  {messageContent.length} karakter
                </Badge>
              </div>
              <CardDescription>
                Gönderilecek mesajın içeriğini yazın
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Mesajınızı buraya yazın..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="min-h-[120px]"
              />
              {/* AI Özgünleştirici kısmı kaldırıldı */}
            </CardContent>
          </Card>

          {/* Gönderim Ayarları */}
          <Card>
            <CardHeader>
              <CardTitle>Gönderim Ayarları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mesaj Arası Bekleme */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <Label className="font-medium">Mesaj Arası Bekleme Süresi</Label>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Select value={messageDelaySeconds.toString()} onValueChange={(value) => setMessageDelaySeconds(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 saniye</SelectItem>
                        <SelectItem value="2">2 saniye</SelectItem>
                        <SelectItem value="3">3 saniye</SelectItem>
                        <SelectItem value="5">5 saniye</SelectItem>
                        <SelectItem value="10">10 saniye</SelectItem>
                        <SelectItem value="30">30 saniye</SelectItem>
                        <SelectItem value="60">1 dakika</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-gray-600">
                    veya
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      max="300"
                      value={messageDelaySeconds}
                      onChange={(e) => setMessageDelaySeconds(Math.max(1, Math.min(300, Number(e.target.value) || 1)))}
                      className="text-center"
                    />
                  </div>
                  <span className="text-sm text-gray-600">saniye</span>
                </div>
                <p className="text-sm text-gray-600">
                  Spam tespitini önlemek için mesajlar arasında bekleme süresi
                </p>
              </div>

              <Separator />

              {/* Gönderim Seçenekleri */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rotation"
                    checked={useRotation}
                    onCheckedChange={(checked) => {
                      setUseRotation(checked as boolean);
                      // This logic is no longer needed as rotation is removed
                    }}
                  />
                  <div className="flex items-center space-x-2">
                    <RotateCcw className="h-4 w-4 text-gray-600" />
                    <Label htmlFor="rotation" className="font-medium">
                      Rotasyon
                    </Label>
                  </div>
                </div>
                <p className="text-sm text-gray-600 ml-6">
                  Mesajları farklı session'lar arasında döngüsel olarak gönder
                </p>

                {/* AI Özgünleştirici kısmı kaldırıldı */}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ai"
                  checked={useAI}
                  onCheckedChange={(checked) => setUseAI(checked as boolean)}
                />
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <Label htmlFor="ai" className="font-medium">
                    AI Özgünleştirici
                  </Label>
                </div>
              </div>
              <p className="text-sm text-gray-600 ml-6">
                Her mesajı AI ile hafifçe farklılaştır
              </p>
              {useAI && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-yellow-800">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-medium">AI Özgünleştirici Aktif</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Her mesaj farklı selamlamalar ile özelleştirilecek
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Seçimi */}
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Session'lar yükleniyor...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Aktif session bulunamadı</p>
              <p className="text-sm mt-1">Session Manager'dan yeni session ekleyin</p>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Session Seçimi</CardTitle>
                    <CardDescription>
                      Mesajları göndermek için kullanılacak session'ı seçin
                    </CardDescription>
                  </div>
                  {sessions.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllSessions}
                    >
                      {selectedSession.length === sessions.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <Checkbox
                        id={session.id}
                        checked={selectedSession.includes(session.id)}
                        onCheckedChange={() => handleSessionToggle(session.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={session.id} className="font-medium cursor-pointer">
                            {session.label}
                          </Label>
                          <Badge variant="outline" className="text-xs">
                            +{session.phone}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{session.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gönder Butonu */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleBulkSend}
                disabled={loading || !messageContent.trim() || getUserCount() === 0 || selectedSession.length === 0}
                className="w-full h-14 bg-[#075E54] hover:bg-[#064e44] text-white font-medium text-lg"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <div className="text-left">
                      <div>Gönderiliyor...</div>
                      <div className="text-sm opacity-80">
                        {/* currentSendingIndex and estimatedTimeLeft are removed */}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Send className="h-5 w-5" />
                    <span>Toplu Mesaj Gönder ({getUserCount()} kişi)</span>
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sağ Panel - Sonuçlar ve İstatistikler */}
        <div className="space-y-6">
          {/* Progress Bar */}
          {(loading || (results && typeof results.current_count === 'number' && typeof results.total_count === 'number')) && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm items-center">
                    <span>İlerleme</span>
                    <span>
                      {typeof results?.current_count === 'number' && typeof results?.total_count === 'number'
                        ? `${Math.round((results.current_count / results.total_count) * 100)}%`
                        : '0%'}
                    </span>
                    {/* Cancel butonu */}
                    {jobId && !cancelled && !cancelling && !jobFinished && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-4 text-red-600 border-red-200"
                        onClick={handleCancelJob}
                        disabled={cancelling}
                      >
                        İptal Et
                      </Button>
                    )}
                    {cancelling && (
                      <span className="ml-4 text-yellow-600 flex items-center"><RefreshCw className="h-4 w-4 animate-spin mr-1" /> İptal ediliyor...</span>
                    )}
                    {cancelled && !jobFinished && (
                      <span className="ml-4 text-gray-600">İşlem iptal edildi. Son gönderilen mesajlar birkaç saniye içinde görünebilir.</span>
                    )}
                    {jobFinished && (
                      <span className="ml-4 text-green-600">İşlem tamamen sonlandı.</span>
                    )}
                  </div>
                  <Progress value={
                    typeof results?.current_count === 'number' && typeof results?.total_count === 'number'
                      ? (results.current_count / results.total_count) * 100
                      : 0
                  } className="h-3" />
                  <div className="flex justify-between text-xs text-gray-600">
                    {typeof results?.current_count === 'number' && typeof results?.total_count === 'number' && (
                      <span>{results.current_count} / {results.total_count} tamamlandı</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sonuçlar Listesi */}
          {results && (
            <>
              {/* Başarılı ve hatalı sayısı */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {Array.isArray(results.data) ? results.data.filter((result: any) => {
                        // Başarı kontrolü
                        if (result.error) return false;
                        if (results.ok) return true;
                        if (result._data?.Info?.IsFromMe === true) return true;
                        return false;
                      }).length : 0}
                    </div>
                    <p className="text-sm text-gray-600">Başarılı</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {Array.isArray(results.data) ? results.data.filter((result: any) => {
                        // Hata kontrolü
                        if (result.error) return true;
                        if (results.ok) return false;
                        if (result._data?.Info?.IsFromMe === false) return true;
                        return false;
                      }).length : 0}
                    </div>
                    <p className="text-sm text-gray-600">Hatalı</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Gönderim Sonuçları</CardTitle>
                  <CardDescription>
                    Son gönderim işleminin detayları
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {Array.isArray(results.data) && results.data.length > 0 ? (
                      results.data.map((result: any, index: number) => {
                        // Telefon numarası
                        console.log(result);
                        let phone = '';
                        if (result._data?.Info?.Chat) {
                          phone = result._data.Info?.Chat.replace(/@.*/, '');
                        } else if (result.chatId) {
                          phone = typeof result.chatId === 'string' ? result.chatId.replace(/@.*/, '') : '';
                        } else if (result.id && typeof result.id === 'string') {
                          const match = result.id.match(/_(\d+)@/);
                          phone = match ? match[1] : '';
                        } else if (result.from && typeof result.from === 'string') {
                          phone = result.to.replace(/@.*/, '');
                        }
                        // Başarı durumu ve kart rengi
                        let status: 'success' | 'pending' | 'error' = 'pending';
                        if (result.error) status = 'error';
                        else if (results.job_status === 'completed') status = 'success';
                        else status = 'pending';
                        // Mesaj içeriği
                        let text = result._data?.body|| '';
                        if (status === 'error' && result.error) {
                          try {
                            const jsonStart = result.error.indexOf('{');
                            if (jsonStart !== -1) {
                              const jsonStr = result.error.slice(jsonStart);
                              const parsed = JSON.parse(jsonStr);
                              if (parsed?.request?.body?.text) {
                                text = parsed.request.body.text;
                              }
                            }
                          } catch (e) {}
                        }
                        // Zaman
                        let timestamp = '';
                        if (result._data?.t) {
                          try {
                            const d = new Date(result._data.t * 1000);
                            timestamp = d.toLocaleString('tr-TR');
                          } catch {}
                        } else if (result._data?.Info?.Timestamp) {
                          try {
                            const d = new Date(result._data.Info.Timestamp);
                            timestamp = d.toLocaleString('tr-TR');
                          } catch {}
                        }
                        // Sender (gönderici) numarası
                        let sender = '';
                        if (result._data?.Info?.Sender) {
                          const match = result._data.Info.Sender.match(/^(\d+)/);
                          sender = match ? match[1] : '';
                        } else if (result.request?.body?.session) {
                          sender = result.request.body.session;
                        } else if (result.from && typeof result.from === 'string') {
                          sender = result.from.replace(/@.*/, '');
                        }
                        // Kart durumu ve ikonunu result.status'a göre belirle
                        let cardClass = '';
                        let icon = null;
                        if (result.job_status === 'completed') {
                          cardClass = 'bg-green-50 border-green-200';
                          icon = <CheckCircle className="h-5 w-5 text-green-600" />;
                        } else if (result.job_status === 'pending') {
                          cardClass = 'bg-yellow-50 border-yellow-200';
                          icon = <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />;
                        } else if (result.job_status === 'error') {
                          cardClass = 'bg-red-50 border-red-200';
                          icon = <AlertCircle className="h-5 w-5 text-red-600" />;
                        } else {
                          cardClass = 'bg-gray-50 border-gray-200';
                          icon = <Info className="h-5 w-5 text-gray-400" />;
                        }
                        return (
                          <div key={index} className={`flex items-center space-x-3 p-3 border rounded-lg ${cardClass}`}>
                            <div className="flex-shrink-0">
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-sm">{phone ? `+${phone}` : '-'}</p>
                                {sender && (
                                  <Badge variant="outline" className="text-xs ml-2">{sender}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600">{text}</p>
                              <p className="text-xs text-gray-500">{timestamp}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-500 text-sm">Gönderim sonucu bulunamadı.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Yardım */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>Kullanım Kılavuzu</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <div>
                <strong>Numara Formatı:</strong> Her satırda numara, ad ve soyad tab ile ayrılmış olmalı: <br />
                <span className="font-mono text-xs">+905551234567\temrullah\ttilki</span>
              </div>
              <div>
                <strong>Rotasyon:</strong> Mesajları farklı session'lar arasında döngüsel olarak gönderir
              </div>
              <div>
                <strong>Bekleme Süresi:</strong> Spam tespitini önlemek için mesajlar arasında bekleme süresi
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 