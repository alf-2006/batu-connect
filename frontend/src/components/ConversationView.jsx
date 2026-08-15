import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare, Clock, CheckCheck, RefreshCw, ArrowRight, Shield,
  User, Bot, Send, Image as ImageIcon, Paperclip, X, Loader2, Sparkles, Eye,
  Calendar, CheckCircle2, Mic, Square, Trash2, Volume2, Download, FileText, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { io } from 'socket.io-client';

export default function ConversationView({ conversationId, onBack }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCodeCard, setErrorCodeCard] = useState(null);

  // Input states
  const [textInput, setTextInput] = useState('');
  const [selectedImageBase64, setSelectedImageBase64] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  
  // Audio recording states
  const [selectedAudioBase64, setSelectedAudioBase64] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Document attachment states
  const [selectedDocBase64, setSelectedDocBase64] = useState(null);
  const [selectedDocName, setSelectedDocName] = useState(null);

  const [sending, setSending] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads')) return `http://localhost:5000${url}`;
    return url;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('studentToken');
      const res = await fetch(`/api/conversations/${conversationId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل جلب المحادثة');
      setConversation(data);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Web Audio Synthesized Dual-Tone Chime Sound
  const playNotificationChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.frequency.setValueAtTime(880, now + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.2);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);
    } catch (e) {}
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    fetchDetails();

    const token = localStorage.getItem('studentToken');
    const socketUrl = (window.location.port === '3000' || window.location.port === '5173') ? 'http://localhost:5000' : undefined;
    const socket = io(socketUrl, {
      auth: { token }
    });
    socket.emit('join_conversation', conversationId);

    socket.on('new_message', (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      if (newMsg.conversationStatus) {
        setConversation((prev) => (prev ? { ...prev, status: newMsg.conversationStatus } : prev));
      }

      // Play Sound Chime & Trigger Browser Desktop Notification if Doctor replied
      if (newMsg.senderType === 'doctor') {
        playNotificationChime();
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('رد جديد من الدكتور', {
              body: newMsg.content || (newMsg.audioUrl ? 'سجل صوتي' : (newMsg.documentUrl ? `مستند: ${newMsg.documentName}` : 'مرفق صورة')),
              icon: '/favicon.ico'
            });
          } catch (e) {}
        }
      }
    });

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.disconnect();
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Recording Timer
  useEffect(() => {
    let timer;
    if (isRecording) {
      setRecordingTime(0);
      timer = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedAudioBase64(reader.result);
          setAudioPreviewUrl(URL.createObjectURL(blob));
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('تعذر فتح الميكروفون. يرجى السماح بالإذن في المتصفح.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearSelectedAudio = () => {
    setSelectedAudioBase64(null);
    setAudioPreviewUrl(null);
  };

  const handleDocSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('حجم المستند كبير جداً، يرجى اختيار ملف أقل من 15 ميجابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setSelectedDocBase64(evt.target.result);
      setSelectedDocName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedDoc = () => {
    setSelectedDocBase64(null);
    setSelectedDocName(null);
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 10 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImageBase64(event.target.result);
      setImagePreviewUrl(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedImage = () => {
    setSelectedImageBase64(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!textInput.trim() && !selectedImageBase64 && !selectedAudioBase64) || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('studentToken');
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          textContent: textInput.trim(),
          imageBase64: selectedImageBase64,
          audioBase64: selectedAudioBase64,
          documentBase64: selectedDocBase64,
          documentName: selectedDocName
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال الرسالة');

      // Append sent message (voice note / text / doc / image) to state immediately
      if (data && data.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }

      if (data.status === 'local_only' || data.warningCode === 'ERR_WA_NOT_CONNECTED') {
        setErrorCodeCard({
          code: 596,
          title: 'مشكلة اقتران السيرفر',
          note: 'تم حفظ الرسالة محلياً • رمز التتبع للمطور: #596'
        });
      }

      setTextInput('');
      clearSelectedImage();
      clearSelectedAudio();
      clearSelectedDoc();
    } catch (err) {
      alert(`خطأ أثناء الإرسال: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-12 text-center rounded-2xl">
        <RefreshCw className="w-8 h-8 text-[#0f766e] animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm font-semibold">جاري فتح الشات التفاعلي...</p>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="glass-card p-8 text-center text-rose-500 rounded-2xl">
        <p className="mb-4">{error || 'المحادثة غير موجودة'}</p>
        <button onClick={onBack} className="btn btn-secondary text-xs font-bold">
          <ArrowRight className="w-4 h-4" /> العودة لقائمة المحادثات
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 flex flex-col h-[700px] border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xl rounded-[28px] relative font-sans dir-rtl">
      
      {/* ── 1. Clean Doctor Header Bar ── */}
      <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shrink-0 z-10">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-400 hover:text-[#0f766e] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="رجوع للقائمة"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="relative">
            {conversation.doctor.avatarUrl ? (
              <img
                src={getFullImageUrl(conversation.doctor.avatarUrl)}
                alt={conversation.doctor.fullName}
                className="w-11 h-11 rounded-full object-cover border-2 border-[#0f766e] shadow-md"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#0f766e] flex items-center justify-center text-white font-extrabold text-base shadow-md">
                {conversation.doctor.fullName.replace('د.', '').trim().charAt(0)}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-white text-base font-display">
              {conversation.doctor.fullName}
            </h2>
          </div>
        </div>
      </div>

      {/* ── 2. Message Stream Container ── */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 flex flex-col justify-start chat-bg-pattern">
        
        {/* Date Divider Pill */}
        <div className="flex justify-center my-2">
          <span className="px-3.5 py-1 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 text-[11.5px] font-bold flex items-center gap-1.5 shadow-xs backdrop-blur-sm">
            <Calendar className="w-3.5 h-3.5 text-[#0f766e]" />
            اليوم • {new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {messages.map((msg) => {
          const isDoctor = msg.senderType === 'doctor';
          const timeFormatted = new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isDoctor ? 'items-start mr-0 ml-auto' : 'items-end ml-0 mr-auto'} max-w-[80%] sm:max-w-[70%]`}
            >
              {/* Chat Bubble */}
              <div
                className={`relative px-4 py-3 shadow-xs transition-all ${
                  isDoctor
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/90 dark:border-slate-700/80 rounded-2xl rounded-tr-xs'
                    : 'bg-[#0f766e] text-white border border-transparent rounded-2xl rounded-tl-xs shadow-md'
                }`}
              >
                {/* Image Attachment inside Bubble */}
                {msg.imageUrl && (
                  <div className="mb-2 relative group overflow-hidden rounded-xl">
                    <img
                      src={getFullImageUrl(msg.imageUrl)}
                      alt="مرفق صورة"
                      className="max-w-xs max-h-64 rounded-xl object-cover border border-white/20 cursor-pointer group-hover:scale-105 transition-transform shadow-md"
                      onClick={() => setLightboxUrl(getFullImageUrl(msg.imageUrl))}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                  </div>
                )}

                {/* Audio Voice Note Attachment inside Bubble */}
                {msg.audioUrl && (
                  <div className={`my-1.5 p-2 rounded-xl flex items-center gap-2 min-w-[210px] ${
                    isDoctor ? 'bg-slate-100 dark:bg-slate-700/70' : 'bg-teal-700/60 text-white'
                  }`}>
                    <Volume2 className={`w-4 h-4 shrink-0 ${isDoctor ? 'text-[#0f766e]' : 'text-teal-200'}`} />
                    <audio controls src={getFullImageUrl(msg.audioUrl)} className="w-full h-8 outline-none rounded-md" />
                  </div>
                )}

                {/* Document Attachment inside Bubble */}
                {msg.documentUrl && (
                  <a
                    href={getFullImageUrl(msg.documentUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`my-1.5 p-3 rounded-xl flex items-center gap-3 border transition-all ${
                      isDoctor
                        ? 'bg-slate-100 dark:bg-slate-700/70 border-slate-200 dark:border-slate-600 hover:border-[#0f766e]'
                        : 'bg-teal-700/60 border-teal-500/40 text-white hover:bg-teal-700/80'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-[#0f766e]/20 text-[#0f766e] dark:text-teal-200 shrink-0 font-bold text-[10px] uppercase">
                      {msg.documentName ? msg.documentName.split('.').pop() : 'DOC'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate dir-ltr text-right">{msg.documentName || 'مستند مرفق'}</p>
                      <p className="text-[10px] opacity-75">انقر لتنزيل المستند</p>
                    </div>
                    <Download className="w-4 h-4 shrink-0 opacity-80" />
                  </a>
                )}

                {/* Text Content */}
                {msg.content && (
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.content}
                  </p>
                )}

                {/* Micro Timestamp & Status nested inside bubble corner */}
                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none font-mono ${
                  isDoctor ? 'text-slate-400 dark:text-slate-400' : 'text-teal-100/80'
                }`}>
                  <span className="dir-ltr">{timeFormatted}</span>
                  {!isDoctor && (
                    msg.status === 'local_only' ? (
                      <span className="text-[9px] font-mono text-amber-300/90 bg-amber-950/40 px-1 py-0.2 rounded border border-amber-500/20" title="خطأ في الربط: #596">
                        #596
                      </span>
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 text-teal-200" />
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Audio Preview Bar (before sending) ── */}
      {audioPreviewUrl && (
        <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <Volume2 className="w-6 h-6 text-[#0f766e] animate-bounce shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white">سجل صوتي جاهز للإرسال</p>
              <audio controls src={audioPreviewUrl} className="w-full h-7 mt-1" />
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelectedAudio}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="إلغاء الصوت"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── Image Preview Bar (before sending) ── */}
      {imagePreviewUrl && (
        <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <img src={imagePreviewUrl} alt="معاينة المرفق" className="w-12 h-12 rounded-xl object-cover border-2 border-[#0f766e]" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">صورة مرفقة جاهزة للإرسال</p>
              <p className="text-[10px] text-slate-500">ستصل إلى الدكتور فوراً عبر المنصة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearSelectedImage}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="إلغاء الصورة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── 3. ChatGPT Style Capsule Input Toolbar ── */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        {/* Document Preview Banner */}
        {selectedDocName && (
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs mb-2 rounded-t-xl">
            <div className="flex items-center gap-2 truncate text-slate-700 dark:text-slate-200 font-medium">
              <FileText className="w-4 h-4 text-[#0f766e] shrink-0" />
              <span className="truncate">تم اختيار المستند: {selectedDocName}</span>
            </div>
            <button onClick={clearSelectedDoc} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 text-rose-500">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-bold">جاري تسجيل فويس نوت... ({recordingTime} ثانية)</span>
            </div>
            <button
              onClick={stopRecording}
              className="btn bg-rose-500 hover:bg-rose-600 text-white text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> إيقاف وحفظ
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="relative flex items-center bg-[#f8fafc] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-[28px] p-2 shadow-lg shadow-slate-200/40 dark:shadow-none focus-within:ring-2 focus-within:ring-[#0f766e] focus-within:border-transparent transition-all">
            
            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.pptx,.ppt,.zip,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,text/plain"
              className="hidden"
              onChange={handleDocSelect}
            />

            {/* Send Button inside floating capsule (Rightmost in RTL) */}
            <button
              type="submit"
              disabled={(!textInput.trim() && !selectedImageBase64 && !selectedAudioBase64 && !selectedDocBase64) || sending}
              className="w-11 h-11 rounded-full bg-[#0f766e] hover:bg-[#0d655e] text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0 disabled:opacity-35 ml-1"
              title="إرسال الرسالة"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 transform rotate-180" />
              )}
            </button>

            {/* Center Input Field */}
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="اكتب رسالتك للدكتور..."
              className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0"
              disabled={sending}
            />

            {/* Image Attachment */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-[#0f766e] transition-colors rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 shrink-0"
              title="إرفاق صورة"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Document Attachment */}
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-[#0f766e] transition-colors rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 shrink-0"
              title="إرفاق مستند (PDF, Word, PPT, ZIP)"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Microphone Voice Recorder Icon */}
            <button
              type="button"
              onClick={startRecording}
              className="p-2.5 text-slate-400 hover:text-rose-500 transition-colors rounded-full hover:bg-rose-500/10 shrink-0"
              title="تسجيل فويس نوت"
            >
              <Mic className="w-5 h-5" />
            </button>

          </form>
        )}
      </div>

      {/* ── 4. Lightbox Modal for Full Image View ── */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 left-0 text-white hover:text-rose-400 p-1"
            >
              <X className="w-7 h-7" />
            </button>
            <img src={lightboxUrl} alt="صورة مكبرة" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/20" />
          </div>
        </div>
      )}

      {/* ── Centered Error Modal (#596) matching User Screenshot Image 1 ── */}
      {errorCodeCard && createPortal(
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans dir-rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] p-8 text-center shadow-2xl relative border border-slate-100 dark:border-slate-800 my-auto animate-scale-in">
            
            {/* Soft Red Shield Icon Badge */}
            <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mx-auto mb-6 text-rose-500 border border-rose-100 dark:border-rose-500/20 shadow-xs">
              <ShieldAlert className="w-10 h-10 text-rose-500 stroke-[1.8]" />
            </div>

            {/* Error Title */}
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-normal font-display">
              حدث خطأ !
            </h3>

            {/* Error Description */}
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">
              لم نتمكن من إرسال رسالتك حالياً.
              <br />
              يرجى المحاولة مرة أخرى.
            </p>

            {/* Red Error Code Badge */}
            <div className="inline-flex items-center justify-center px-6 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 font-bold text-sm mb-8 border border-rose-100 dark:border-rose-500/20 shadow-xs font-mono">
              <span className="text-rose-500 ml-1.5 font-sans">رمز الخطأ :</span> #{errorCodeCard.code || 596}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setErrorCodeCard(null)}
                className="flex-1 py-3 px-5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                <span>إغلاق</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorCodeCard(null);
                  fetchConversationDetails();
                }}
                className="flex-1 py-3 px-5 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-bold text-sm shadow-md hover:shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
