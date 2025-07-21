'use client';

import { useState, useEffect } from 'react';
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
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [useRotation, setUseRotation] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [messageDelaySeconds, setMessageDelaySeconds] = useState(1);

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

  // AI ile mesajı özelleştir (geliştirilmiş)
  const customizeMessageWithAI = (originalMessage: string, phoneNumber: string): string => {
    const greetings = ['Merhaba', 'Selam', 'İyi günler', 'Merhaba değerli müşterimiz', 'Selam'];
    const endings = ['', ' 🙂', ' 😊', ' 👋', ''];
    const connectors = ['', ', ', '! ', ' - '];
    
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    const ending = endings[Math.floor(Math.random() * endings.length)];
    const connector = connectors[Math.floor(Math.random() * connectors.length)];
    
    return `${greeting}${connector}${originalMessage}${ending}`;
  };


  // Toplu mesaj gönder
  const handleBulkSend = async () => {
    if (!messageContent.trim()) {
      alert('Lütfen mesaj içeriğini girin');
      return;
    }
    const numbers = phoneNumbers
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    if (numbers.length === 0) {
      alert('Lütfen en az bir telefon numarası girin');
      return;
    }
    if (selectedSession.length === 0) {
      alert('Lütfen en az bir session seçin');
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      let payload: any = {
        chatIds: numbers,
        reply_to: null,
        text: messageContent,
        linkPreview: true,
        linkPreviewHighQuality: false,
        sessions: selectedSession,
        is_rotation_enabled: useRotation ? 'true' : 'false',
        message_delay_seconds: messageDelaySeconds,
      };
      // Eğer AI özgünleştirici aktifse, her numara için mesajı özelleştir
      if (useAI) {
        payload.texts = numbers.map(num => customizeMessageWithAI(messageContent, num));
      }
      const response = await authenticatedFetch('/send-text-multiple', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      setResults({ ok: response.ok, data });
      if (!response.ok) {
        alert(data.message || 'Toplu mesaj gönderilemedi');
      }
    } catch (error) {
      setResults({ ok: false, data: { message: 'Bağlantı hatası' } });
      alert('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

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
          {/* Telefon Numaraları */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-[#075E54]" />
                  <CardTitle>Telefon Numaraları</CardTitle>
                </div>
                <Badge variant="outline" className="text-sm">
                  {phoneNumbers.split('\n').filter(x => x.trim().length > 0).length} geçerli numara
                </Badge>
              </div>
              <CardDescription>
                Her satıra bir telefon numarası girin (90XXXXXXXXXX formatında)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="905551234567&#10;905551234568&#10;905551234569"
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
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
                disabled={loading || !messageContent.trim() || phoneNumbers.split('\n').filter(x => x.trim().length > 0).length === 0 || selectedSession.length === 0}
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
                    <span>Toplu Mesaj Gönder ({phoneNumbers.split('\n').filter(x => x.trim().length > 0).length} kişi)</span>
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
          {results && (
            <div className="mt-4 p-4 bg-gray-100 rounded text-xs break-all">
              <strong>Sonuçlar:</strong>
              <pre>{JSON.stringify(results, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Sağ Panel - Sonuçlar ve İstatistikler */}
        <div className="space-y-6">
          {/* Progress Bar */}
          {loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>İlerleme</span>
                    <span>0%</span>
                  </div>
                  <Progress value={0} className="h-3" />
                  <div className="flex justify-between text-xs text-gray-600">
                    {/* currentSendingIndex and estimatedTimeLeft are removed */}
                  </div>
                  {/* isPaused and togglePause are removed */}
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
                        if (!results.ok) return true;
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
                        let phone = '';
                        if (result._data?.Info?.Chat) {
                          phone = result._data.Info.Chat.replace(/@.*/, '');
                        } else if (result.id) {
                          // id: true_905332310912@c.us_... gibi
                          const match = result.id.match(/_(\d+)@/);
                          phone = match ? match[1] : '';
                        }
                        // Mesaj içeriği
                        let text = result._data?.Message?.extendedTextMessage?.text || '';
                        // Zaman
                        let timestamp = '';
                        if (result._data?.Info?.Timestamp) {
                          try {
                            const d = new Date(result._data.Info.Timestamp);
                            timestamp = d.toLocaleString('tr-TR');
                          } catch {}
                        }
                        // Başarı durumu
                        let isSuccess = false;
                        if (results.ok) isSuccess = true;
                        else if (result._data?.Info?.IsFromMe === true) isSuccess = true;
                        else if (result._data?.Info?.IsFromMe === false) isSuccess = false;
                        return (
                          <div key={index} className={`flex items-center space-x-3 p-3 border rounded-lg ${isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex-shrink-0">
                              {isSuccess ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-sm">{phone ? `+${phone}` : '-'}</p>
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
                <strong>Numara Formatı:</strong> 90XXXXXXXXXX formatında girin (örn: 905551234567)
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