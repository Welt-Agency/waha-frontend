'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Users, RefreshCw, AlertCircle, CheckCircle, Zap, RotateCcw, Clock, Info, Play, Pause, X, History, Eye } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { authenticatedFetch } from '@/lib/auth';
import { useSessionStore } from '@/hooks/useSessionStore';

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

interface JobResult {
  _data: {
    id: {
      fromMe: boolean;
      remote: string;
      id: string;
      self: string;
      _serialized: string;
    };
    body: string;
    t: number;
    from: {
      server: string;
      user: string;
      _serialized: string;
    };
    to: {
      server: string;
      user: string;
      _serialized: string;
    };
    Info?: {
      IsFromMe?: boolean;
      Chat?: string;
      Sender?: string;
      Timestamp?: number;
    };
  };
  id: {
    fromMe: boolean;
    remote: string;
    id: string;
    _serialized: string;
  };
  body: string;
  timestamp: number;
  from: string;
  to: string;
  fromMe: boolean;
  error?: string;
}

interface Job {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  result: JobResult[];
  total_count: number;
  current_count: number;
  cancelled: boolean;
  finished: boolean;
  message_delay_seconds: number;
  created_at: string;
  updated_at: string;
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
  const [selectedSession, setSelectedSession] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [useRotation, setUseRotation] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [messageDelaySeconds, setMessageDelaySeconds] = useState(1);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [jobDetailPollingInterval, setJobDetailPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // useSessionStore'dan session'ları al
  const { sessions: apiSessions, loading: sessionsLoading, fetchSessions } = useSessionStore();
  
  // API session'larını formatla
  const sessions: Session[] = apiSessions
    .filter(session => session.me && session.me.id && session.status === 'WORKING')
    .map((session, index) => ({
      id: session.name,
      name: session.name,
      label: session.me!.pushName || `Session ${index + 1}`,
      phone: session.me!.id.replace('@c.us', ''),
      status: session.status
    }));

  // Kullanıcı sayısını hesapla (her satır bir kişi)
  const getUserCount = () => {
    return phoneListText.split('\n').filter(line => line.trim().length > 0).length;
  };



  // API'den jobs'ları çek
  const fetchJobs = async (showLoading = true) => {
    try {
      if (showLoading) setJobsLoading(true);
      const response = await authenticatedFetch('/jobs/');
      if (!response.ok) throw new Error('Jobs verileri alınamadı');
      
      const jobsData: Job[] = await response.json();
      
      // Yeni job'ları en tepeye ekle (en yeni job'lar önce)
      setJobs(jobsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      if (showLoading) setJobsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(true);
  }, []);

  // Jobs'ları periyodik olarak güncelle (pending job'lar için)
  useEffect(() => {
    const jobsInterval = setInterval(() => {
      if (jobs.some(job => job.status === 'pending' && !job.finished)) {
        fetchJobs(false); // Arka planda fetch et, loading gösterme
      }
    }, 10000); // 10 saniyede bir kontrol et

    return () => clearInterval(jobsInterval);
  }, [jobs]);

  // Component unmount olduğunda polling'i temizle
  useEffect(() => {
    return () => {
      if (jobDetailPollingInterval) {
        clearInterval(jobDetailPollingInterval);
      }
    };
  }, [jobDetailPollingInterval]);


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
        // Jobs listesini güncelle
        setTimeout(() => fetchJobs(false), 1000);
        setLoading(false);
      } else {
        setLoading(false);
        alert(data.message || 'Job başlatılamadı');
      }
    } catch (error) {
      setLoading(false);
      alert('Bağlantı hatası');
    }
  };



  // Cancel job fonksiyonu
  const handleCancelJob = async (jobId: string) => {
    setCancelling(true);
    try {
      await authenticatedFetch(`/job-cancel/${jobId}`, { method: 'POST' });
      setCancelling(false);
      
      // Job detaylarını güncelle
      if (selectedJob && selectedJob.id === jobId) {
        try {
          const response = await authenticatedFetch(`/jobs/${jobId}`);
          if (response.ok) {
            const updatedJob: Job = await response.json();
            setSelectedJob(updatedJob);
            
            // Eğer job iptal edildiyse polling'i durdur
            if (updatedJob.cancelled) {
              if (jobDetailPollingInterval) {
                clearInterval(jobDetailPollingInterval);
                setJobDetailPollingInterval(null);
              }
            }
          }
        } catch (error) {
          console.error('Error updating job details after cancel:', error);
        }
      }
      
      // Jobs listesini güncelle
      setTimeout(() => fetchJobs(false), 1000);
    } catch (err) {
      setCancelling(false);
      alert('Job iptal edilemedi');
    }
  };

  // Job detaylarını göster
  const showJobDetailsModal = (job: Job) => {
    setSelectedJob(job);
    setShowJobDetails(true);
    
    // Eğer job pending ise polling başlat
    if (job.status === 'pending' && !job.finished) {
      startJobDetailPolling(job.id, job.message_delay_seconds);
    }
  };

  // Job detayları için polling başlat
  const startJobDetailPolling = (jobId: string, delaySeconds: number) => {
    // Önceki polling'i temizle
    if (jobDetailPollingInterval) {
      clearInterval(jobDetailPollingInterval);
    }
    
    // Yeni polling interval'ı başlat
    const interval = setInterval(async () => {
      try {
        const response = await authenticatedFetch(`/jobs/${jobId}`);
        if (response.ok) {
          const updatedJob: Job = await response.json();
          setSelectedJob(updatedJob);
          
          // Eğer job tamamlandı veya iptal edildiyse polling'i durdur
          if (updatedJob.finished || updatedJob.cancelled || updatedJob.status !== 'pending') {
            clearInterval(interval);
            setJobDetailPollingInterval(null);
          }
        }
      } catch (error) {
        console.error('Job detail polling error:', error);
      }
    }, Math.max(1000, delaySeconds * 1000)); // En az 1 saniye, delay_seconds kadar bekle
    
    setJobDetailPollingInterval(interval);
  };

  // Job detayları modal'ı kapatıldığında polling'i durdur
  const handleJobDetailsClose = () => {
    if (jobDetailPollingInterval) {
      clearInterval(jobDetailPollingInterval);
      setJobDetailPollingInterval(null);
    }
    setShowJobDetails(false);
    setSelectedJob(null);
  };

  // Job durumuna göre badge rengi
  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Tamamlandı</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Devam Ediyor</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Başarısız</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">İptal Edildi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Job sonuçlarını formatla
  const formatJobResults = (job: Job) => {
    if (!job.result || !Array.isArray(job.result)) return [];
    
    return job.result.map((result, index) => {
      // Telefon numarası
      let phone = '';
      if (result._data?.Info?.Chat) {
        phone = result._data.Info.Chat.replace(/@.*/, '');
      } else if (result.to) {
        phone = result.to.replace(/@.*/, '');
      }
      
      // Başarı durumu - her result'ın kendi durumuna göre belirle
      let status: 'success' | 'pending' | 'error' = 'pending';
      if (result.error) {
        status = 'error';
      } else if (result._data && result._data.id && result._data.body) {
        // Eğer result'da mesaj verisi varsa başarılı
        status = 'success';
      } else if (job.status === 'completed') {
        // Job tamamlandıysa ve hata yoksa başarılı
        status = 'success';
      }
      
      // Mesaj içeriği
      let text = result._data?.body || result.body || '';
      
      // Zaman
      let timestamp = '';
      if (result._data?.t) {
        try {
          const d = new Date(result._data.t * 1000);
          timestamp = d.toLocaleString('tr-TR');
        } catch {}
      }
      
      // Sender (gönderici) numarası
      let sender = '';
      if (result._data?.Info?.Sender) {
        const match = result._data.Info.Sender.match(/^(\d+)/);
        sender = match ? match[1] : '';
      } else if (result.from) {
        sender = result.from.replace(/@.*/, '');
      }
      
      return {
        phone,
        status,
        text,
        timestamp,
        sender,
        error: result.error
      };
    });
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
          {/* Geçmiş Job'lar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <History className="h-5 w-5 text-[#075E54]" />
                  <CardTitle>Geçmiş Job'lar</CardTitle>
                </div>
                <Button
                  onClick={() => fetchJobs(true)}
                  variant="outline"
                  size="sm"
                  disabled={jobsLoading}
                >
                  {jobsLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Yenile
                </Button>
              </div>
              <CardDescription>
                Önceki toplu mesaj gönderim işlemleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Job'lar yükleniyor...</span>
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-8 w-8 mx-auto mb-2" />
                  <p>Henüz job bulunamadı</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {jobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            {getJobStatusBadge(job.status)}
                            <span className="text-xs text-gray-600 truncate">
                              {new Date(job.created_at).toLocaleString('tr-TR')}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => showJobDetailsModal(job)}
                          className="px-2 py-1 text-xs h-auto min-w-0 flex-shrink-0"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Detaylar</span>
                          <span className="sm:hidden">...</span>
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Toplam:</span>
                          <span className="font-medium">{job.total_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Tamamlanan:</span>
                          <span className="font-medium">{job.current_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Bekleme:</span>
                          <span className="font-medium">{job.message_delay_seconds}s</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Başarılı:</span>
                          <span className="font-medium text-green-600">
                            {formatJobResults(job).filter(r => r.status === 'success').length}
                          </span>
                        </div>
                      </div>
                      
                      {job.status === 'pending' && !job.finished && (
                        <div className="mt-3">
                          <Progress 
                            value={(job.current_count / job.total_count) * 100} 
                            className="h-2" 
                          />
                          <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>{job.current_count} / {job.total_count}</span>
                            <span>{Math.round((job.current_count / job.total_count) * 100)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>



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

      {/* Job Detayları Modal */}
      <Dialog open={showJobDetails} onOpenChange={handleJobDetailsClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Job Detayları</DialogTitle>
              {selectedJob && selectedJob.status === 'pending' && !selectedJob.finished && !selectedJob.cancelled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelJob(selectedJob.id)}
                  disabled={cancelling}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  {cancelling ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      İptal Ediliyor...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      İptal Et
                    </>
                  )}
                </Button>
              )}
            </div>
            <DialogDescription>
              {selectedJob ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Job ID: {selectedJob.id}</span>
                    {getJobStatusBadge(selectedJob.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Oluşturulma:</span>
                      <span className="ml-2">{new Date(selectedJob.created_at).toLocaleString('tr-TR')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Güncellenme:</span>
                      <span className="ml-2">{new Date(selectedJob.updated_at).toLocaleString('tr-TR')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Toplam:</span>
                      <span className="ml-2">{selectedJob.total_count}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Tamamlanan:</span>
                      <span className="ml-2">{selectedJob.current_count}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Bekleme Süresi:</span>
                      <span className="ml-2">{selectedJob.message_delay_seconds}s</span>
                    </div>
                    <div>
                      <span className="text-gray-600">İptal Edildi:</span>
                      <span className="ml-2">{selectedJob.cancelled ? 'Evet' : 'Hayır'}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          
          {selectedJob ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {formatJobResults(selectedJob).filter(r => r.status === 'success').length}
                    </div>
                    <p className="text-sm text-gray-600">Başarılı</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {formatJobResults(selectedJob).filter(r => r.status === 'error').length}
                    </div>
                    <p className="text-sm text-gray-600">Hatalı</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">
                      {formatJobResults(selectedJob).filter(r => r.status === 'pending').length}
                    </div>
                    <p className="text-sm text-gray-600">Bekliyor</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                <h4 className="font-medium">Gönderim Sonuçları</h4>
                {formatJobResults(selectedJob).length > 0 ? (
                  formatJobResults(selectedJob).map((result, index) => {
                    let cardClass = '';
                    let icon = null;
                    
                    if (result.status === 'success') {
                      cardClass = 'bg-green-50 border-green-200';
                      icon = <CheckCircle className="h-5 w-5 text-green-600" />;
                    } else if (result.status === 'pending') {
                      cardClass = 'bg-yellow-50 border-yellow-200';
                      icon = <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />;
                    } else if (result.status === 'error') {
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
                            <p className="font-medium text-sm">{result.phone ? `+${result.phone}` : '-'}</p>
                            {result.sender && (
                              <Badge variant="outline" className="text-xs ml-2">{result.sender}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">{result.text}</p>
                          <p className="text-xs text-gray-500">{result.timestamp}</p>
                          {result.error && (
                            <p className="text-xs text-red-600 mt-1">{result.error}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-gray-500 text-sm">Gönderim sonucu bulunamadı.</div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
} 