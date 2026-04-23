/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  Settings2, 
  Mic2,
  RotateCcw,
  Languages,
  ChevronDown,
  Trash2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceOption {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
}

export default function App() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  
  // Dynamically generate supported languages from PRO_VOICES plus some standard ones
  const initialLangs = Array.from(new Set([
    'vi-VN', 'en-US', 'en-GB', 'en-AU', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES', 'zh-CN', 'id-ID', 'th-TH', 'ru-RU', 'it-IT', 'pt-BR', 'ar-SA'
  ]));
  const [languages, setLanguages] = useState<string[]>(initialLangs);
  const [selectedLang, setSelectedLang] = useState('vi-VN');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [useCloud, setUseCloud] = useState(true);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudAudioUrl, setCloudAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const PRO_VOICES = [
    { id: 'google-standard-vi', name: 'Giọng Google (Tiếng Việt)', lang: 'vi', quality: 'Ổn định', type: 'Nữ', country: 'Vietnam' },
    { id: 'google-standard-en', name: 'Google Voice (English)', lang: 'en', quality: 'Ổn định', type: 'Nữ', country: 'USA' },
    { id: 'google-standard-ja', name: 'Google Voice (日本語)', lang: 'ja', quality: 'Ổn định', type: 'Nữ', country: 'Japan' },
    { id: 'google-standard-ko', name: 'Google Voice (한국어)', lang: 'ko', quality: 'Ổn định', type: 'Nữ', country: 'Korea' },
    { id: 'google-standard-zh', name: 'Google Voice (中文)', lang: 'zh', quality: 'Ổn định', type: 'Nữ', country: 'China' },
    { id: 'google-standard-fr', name: 'Google Voice (Français)', lang: 'fr', quality: 'Ổn định', type: 'Nữ', country: 'France' },
    { id: 'google-standard-de', name: 'Google Voice (Deutsch)', lang: 'de', quality: 'Ổn định', type: 'Nữ', country: 'Germany' },
    { id: 'google-standard-es', name: 'Google Voice (Español)', lang: 'es', quality: 'Ổn định', type: 'Nữ', country: 'Spain' },
    { id: 'google-standard-id', name: 'Google Voice (Bahasa)', lang: 'id', quality: 'Ổn định', type: 'Nữ', country: 'Indonesia' },
    { id: 'google-standard-th', name: 'Google Voice (ไทย)', lang: 'th', quality: 'Ổn định', type: 'Nữ', country: 'Thailand' },
    { id: 'google-standard-ru', name: 'Google Voice (Русский)', lang: 'ru', quality: 'Ổn định', type: 'Nữ', country: 'Russia' },
    { id: 'google-standard-it', name: 'Google Voice (Italiano)', lang: 'it', quality: 'Ổn định', type: 'Nữ', country: 'Italy' },
    { id: 'google-standard-pt', name: 'Google Voice (Português)', lang: 'pt', quality: 'Ổn định', type: 'Nữ', country: 'Brazil' },
    { id: 'google-standard-ar', name: 'Google Voice (العربية)', lang: 'ar', quality: 'Ổn định', type: 'Nữ', country: 'Saudi Arabia' }
  ];

  // Helper to get flag and friendly name
  const getLanguageLabel = (langTag: string) => {
    const isVi = langTag.toLowerCase().includes('vi');
    try {
      const parts = langTag.split(/[-_]/);
      const langCode = parts[0];
      const regionCode = parts[1];

      // Native Intl API to get names in Vietnamese
      const langNames = new Intl.DisplayNames(['vi'], { type: 'language' });
      const regionNames = new Intl.DisplayNames(['vi'], { type: 'region' });

      let label = langNames.of(langCode) || langCode;
      label = label.charAt(0).toUpperCase() + label.slice(1);

      let result = '';
      if (regionCode) {
        const flag = regionCode
          .toUpperCase()
          .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
        const regionName = regionNames.of(regionCode.toUpperCase()) || regionCode;
        result = `${flag} ${label} (${regionName})`;
      } else {
        const manualFlags: Record<string, string> = {
          'en': '🇺🇸', 'vi': '🇻🇳', 'fr': '🇫🇷', 'de': '🇩🇪', 'ja': '🇯🇵', 'ko': '🇰🇷', 'zh': '🇨🇳'
        };
        result = `${manualFlags[langCode] || '🌐'} ${label}`;
      }

      return isVi ? `⭐ ${result} [ƯU TIÊN]` : result;
    } catch (e) {
      return isVi ? `⭐ ${langTag} [ƯU TIÊN]` : langTag;
    }
  };
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');

  const filteredProVoices = useMemo(() => {
    const list = PRO_VOICES.filter(v => {
      const matchesLang = selectedLang.startsWith(v.lang);
      const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGender = genderFilter === 'all' || v.type === genderFilter;
      return matchesLang && matchesSearch && matchesGender;
    });

    if (list.length === 0 && !searchTerm) {
      const langCode = selectedLang.split('-')[0];
      list.push({
        id: `google-standard-${langCode}`,
        name: `Google Standard (${getLanguageLabel(selectedLang)})`,
        lang: langCode,
        quality: 'Tiêu chuẩn',
        type: 'Nữ',
        country: 'Global'
      });
    }
    return list;
  }, [selectedLang, searchTerm, genderFilter]);

  const [selectedProVoice, setSelectedProVoice] = useState(PRO_VOICES[0]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<string | null>(null);

  // Automatically update selectedProVoice when language changes
  useEffect(() => {
    if (filteredProVoices.length > 0) {
      const isCurrentValid = filteredProVoices.some(v => v.id === selectedProVoice.id);
      if (!isCurrentValid) {
        setSelectedProVoice(filteredProVoices[0]);
      }
    }
  }, [selectedLang, filteredProVoices, selectedProVoice.id]);

  // Sync volume with audio element and speech synth
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    // Update active utterance if exists
    if (utteranceRef.current) {
      utteranceRef.current.volume = volume;
    }
  }, [volume]);

  // Reactive playback rate for audio element
  useEffect(() => {
    if (utteranceRef.current && !useCloud) {
       utteranceRef.current.rate = rate;
    }
  }, [rate]);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  
  const synth = window.speechSynthesis;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      
      if (availableVoices.length === 0 && attempts < maxAttempts) {
        attempts++;
        setTimeout(loadVoices, 200);
        return;
      }

      const options = availableVoices.filter(v => !v.lang.toLowerCase().includes('vi')).map(v => ({
        name: v.name,
        lang: v.lang,
        voice: v
      }));
      setVoices(options);
      
      const proLangs = PRO_VOICES.map(v => v.lang);
      const uniqueLangs = Array.from(new Set([...options.map(v => v.lang), ...proLangs])).sort((a, b) => {
        const aIsVi = a.toLowerCase().includes('vi');
        const bIsVi = b.toLowerCase().includes('vi');
        if (aIsVi && !bIsVi) return -1;
        if (!aIsVi && bIsVi) return 1;
        return a.localeCompare(b);
      });
      
      // Force 'vi-VN' to be present and first if it was somehow filtered
      if (!uniqueLangs.some(l => l.toLowerCase().includes('vi'))) {
        uniqueLangs.unshift('vi-VN');
      }
      
      setLanguages(uniqueLangs);

      if (uniqueLangs.length > 0) {
        // Find if any Vietnamese language exists
        const viLang = uniqueLangs.find(l => l.toLowerCase().includes('vi'));
        
        // Priority: Use found viLang, or force 'vi-VN' at the top
        const firstLang = viLang || uniqueLangs[0];
        setSelectedLang(firstLang);
        
        // Final sanity check: if Vi exists, it should be first in the array
        const sortedWithVip = [...uniqueLangs].sort((a, b) => {
          const aIsVi = a.toLowerCase().includes('vi');
          const bIsVi = b.toLowerCase().includes('vi');
          if (aIsVi && !bIsVi) return -1;
          if (!aIsVi && bIsVi) return 1;
          return a.localeCompare(b);
        });
        setLanguages(sortedWithVip);

        const viVoices = options.filter(v => v.lang.toLowerCase().includes('vi'));
        const defaultVoice = viVoices[0]?.voice || options.find(o => o.lang === firstLang)?.voice || availableVoices[0] || null;
        setSelectedVoice(defaultVoice);
      }
    };

    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }

    return () => {
      synth.cancel();
    };
  }, []);

  useEffect(() => {
    if (useCloud) {
      const match = PRO_VOICES.find(v => selectedLang.startsWith(v.lang));
      if (match && !selectedProVoice.id.startsWith(selectedLang)) {
        setSelectedProVoice(match);
      }
    }
  }, [selectedLang, useCloud]);

  const handleSpeak = async () => {
    if (isPaused && !useCloud) {
      synth.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    if (!text) return;

    if (useCloud) {
      try {
        setIsCloudLoading(true);
        setIsSpeaking(true);
        
        const maxChars = 2000;
        const textToSpeak = text.length > maxChars ? text.slice(0, maxChars) : text;
        const proxyUrl = `/api/tts-proxy?text=${encodeURIComponent(textToSpeak)}&lang=${selectedProVoice.lang}&voiceId=${selectedProVoice.id}&rate=${rate}&volume=${volume}&cb=${Date.now()}`;
        
        // Fetch manually to check for errors (like 503)
        const response = await fetch(proxyUrl);
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Dịch vụ Cloud TTS tạm thời không khả dụng.");
          }
          throw new Error("Không thể kết nối với máy chủ âm thanh.");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        setCloudAudioUrl(url);
        if (audioRef.current) {
          audioRef.current.volume = volume;
          audioRef.current.src = url;
          
          try {
            await audioRef.current.play();
          } catch (playError) {
            if (playError instanceof Error && playError.name !== 'AbortError') {
              console.error("Playback failed", playError.message);
            }
          }

          audioRef.current.onended = () => {
            setIsSpeaking(false);
            setCurrentWord('');
            URL.revokeObjectURL(url);
          };
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định.";
        alert(`Lỗi phát âm: ${errorMsg}`);
        setIsSpeaking(false);
      } finally {
        setIsCloudLoading(false);
      }
      return;
    }
    // ... rest of local synthesis logic

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = rate;
    utterance.volume = volume;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentWord('');
    };

    utterance.onpause = () => {
      setIsPaused(true);
      setIsSpeaking(false);
    };

    utterance.onresume = () => {
      setIsPaused(false);
      setIsSpeaking(true);
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const word = text.slice(event.charIndex, event.charIndex + event.charLength);
        setCurrentWord(word);
      }
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
  };

  const handlePause = () => {
    if (isSpeaking) {
      synth.pause();
    }
  };

  const handleStop = () => {
    synth.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentWord('');
  };

  const handleReset = () => {
    setRate(1);
    setVolume(1);
  };

  const handlePreviewVoice = async (voice: typeof PRO_VOICES[0]) => {
    try {
      setIsPreviewLoading(voice.id);
      
      const samples: Record<string, string> = {
        'vi': "Xin chào, đây là bản nghe thử giọng đọc của tôi.",
        'en': "Hello, this is a sample of my voice.",
        'ja': "こんにちは、これは私の声のサンプルです。",
        'ko': "안녕하세요, 이것은 제 목소리 샘플입니다.",
        'fr': "Bonjour, ceci est un échantillon de ma voix.",
        'de': "Hallo, dies ist eine Hörprobe meiner Stimme.",
        'es': "Hola, esta es una muestra de mi voz.",
        'zh': "您好，这是我的语音样本。",
        'id': "Halo, ini adalah contoh suara saya.",
        'th': "สวัสดีนี่คือตัวอย่างเสียงของฉัน",
        'ar': "مرحباً، هذه عينة من صوتي.",
        'ru': "Здравствуйте, это образец моего голоса.",
        'it': "Ciao, questo è un campione della mia voce.",
        'pt': "Olá, este é um exemplo da minha voz."
      };

      const previewText = samples[voice.lang] || "Hello, this is a test.";
      const url = `/api/tts-proxy?text=${encodeURIComponent(previewText)}&lang=${voice.lang}&voiceId=${voice.id}&rate=1&volume=1&cb=${Date.now()}`;
      
      // Stop current preview
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = "";
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Không thể tải giọng nghe thử.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      if (previewAudioRef.current) {
        previewAudioRef.current.src = blobUrl;
        
        try {
          await previewAudioRef.current.play();
        } catch (playError) {
          if (playError instanceof Error && playError.name !== 'AbortError') {
             console.error("Playback failed", playError.message);
          }
        }
        
        previewAudioRef.current.onended = () => {
          URL.revokeObjectURL(blobUrl);
        };
      }
    } catch (error) {
      console.error("Preview failed", error);
      alert(`Lỗi nghe thử: ${error instanceof Error ? error.message : "Vui lòng thử lại sau."}`);
    } finally {
      setIsPreviewLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col font-sans overflow-hidden">
      <audio ref={previewAudioRef} className="hidden" />
      <audio 
        ref={audioRef} 
        className="hidden" 
        onError={(e) => {
          const target = e.target as HTMLAudioElement;
          const error = target.error;
          console.error("Audio Load Error Code:", error?.code);
          let msg = "Không thể phát âm thanh. Vui lòng thử lại hoặc chọn giọng đọc khác.";
          if (error?.code === 4) {
            msg = "Lỗi kết nối máy chủ hoặc dịch vụ TTS tạm thời không khả dụng. Vui lòng thử lại sau.";
          }
          alert(`Lỗi: ${msg}`);
          setIsSpeaking(false);
          setIsCloudLoading(false);
        }}
      />
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-800 bg-[#1e293b]/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <img 
            src="https://sf-static.upanhlaylink.com/img/image_20260423f5642f951243154f263e3f9f1295ce15.jpg" 
            alt="FreeVoice TTS" 
            className="h-10 w-auto object-contain rounded-md"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full border border-slate-700">
            <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-slate-600'}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {isCloudLoading ? 'Đang kết nối Cloud...' : (isSpeaking ? 'Đang phát' : 'Đang chờ')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-indigo-500/30 flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden shadow-lg shadow-indigo-500/10">
            <img 
              src="https://sf-static.upanhlaylink.com/img/image_20260423b9e9c41bbcb21fe3b3a39d47186f8810.jpg" 
              alt="User Profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </nav>

      {/* Main Content Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Input Section (Left) */}
        <section className="flex-1 p-8 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-300">Trình Biên Tập Văn Bản</h1>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              {text.length} / 5,000 ký tự
            </div>
          </div>
          
          <div className="flex-1 relative min-h-[300px]">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập văn bản của bạn tại đây để bắt đầu chuyển đổi..."
              className="w-full h-full bg-[#1e293b]/30 border border-slate-800 rounded-2xl p-6 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed text-lg transition-all"
            />
            <div className="absolute bottom-6 right-6">
              <button 
                onClick={() => setText('')}
                className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                title="Xóa tất cả"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Visualizer and Main Actions */}
          <div className="flex flex-col gap-4">
            {/* Visualizer Feed */}
            <div className="h-14 bg-[#1e293b]/20 rounded-xl border border-slate-800/50 flex items-center justify-center overflow-hidden relative">
              <AnimatePresence mode="wait">
                {currentWord ? (
                  <motion.span
                    key={currentWord}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-indigo-400 font-mono text-xl font-bold tracking-wider uppercase italic"
                  >
                    {currentWord}
                  </motion.span>
                ) : (
                  <span className="text-slate-700 text-[10px] font-mono uppercase tracking-[0.3em]">Hệ thống AI sẵn sàng</span>
                )}
              </AnimatePresence>
              
              {isSpeaking && (
                <div className="absolute right-10 flex gap-1.5 items-end h-5">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 16, 4] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.6, 
                        delay: i * 0.1,
                        ease: "easeInOut" 
                      }}
                      className="w-1 bg-indigo-500/40 rounded-full"
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                disabled={!text}
                onClick={handleSpeak}
                className={`flex-1 py-4 flex items-center justify-center gap-3 font-bold rounded-xl shadow-lg transition-all active:scale-95 ${
                  !text 
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/20'
                }`}
              >
                {isPaused ? <Play size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                <span className="uppercase tracking-widest text-sm">
                  {isPaused ? 'Tiếp tục' : (isSpeaking ? 'Đang phát...' : 'Phát Thử Ngay')}
                </span>
              </button>
              
              <div className="flex gap-2">
                <button
                  disabled={!isSpeaking}
                  onClick={handlePause}
                  className="px-6 bg-slate-800 text-slate-300 font-bold rounded-xl border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <Pause size={20} fill="currentColor" />
                </button>
                <button
                  disabled={!isSpeaking && !isPaused}
                  onClick={handleStop}
                  className="px-6 bg-slate-800 text-slate-300 font-bold rounded-xl border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <Square size={20} fill="currentColor" />
                </button>
                {useCloud && cloudAudioUrl && (
                  <a 
                    href={`${cloudAudioUrl}&download=true`}
                    className="px-6 bg-indigo-600/20 text-indigo-400 font-bold rounded-xl border border-indigo-500/30 hover:bg-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                    title="Tải về file MP3"
                  >
                    <Download size={20} />
                    <span className="hidden sm:inline uppercase text-[10px] tracking-widest">Tải MP3</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Controls Sidebar (Right) */}
        <aside className="w-80 bg-[#1e293b]/40 border-l border-slate-800 p-6 flex flex-col gap-8 overflow-y-auto">
          
          {/* Voice Selector */}
          <div className="space-y-6">
              <div className="p-4 bg-green-500/10 border border-green-500/40 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                    <Mic2 size={14} className="text-green-400" /> Chế độ giọng đọc
                  </label>
                  <div className="p-1 px-2 bg-green-500/20 text-green-400 text-[9px] font-bold rounded-md border border-green-500/30 uppercase tracking-tighter">
                    Google TTS
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Hệ thống ổn định tuyệt đối từ Google. Hỗ trợ văn bản dài không giới hạn.
                </p>
              </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-3 block flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Languages size={14} /> Khu vực & Ngôn Ngữ</span>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-[9px] text-indigo-400/60 hover:text-indigo-400 font-mono tracking-tighter"
                  title="Tải lại danh sách"
                >
                  [TẢI LẠI]
                </button>
              </label>
              <div className="relative">
                <select 
                  value={selectedLang}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setSelectedLang(newLang);
                    
                    if (useCloud) {
                      const match = PRO_VOICES.find(v => newLang.startsWith(v.lang));
                      if (match) setSelectedProVoice(match);
                    } else {
                      const firstVoiceOfLang = voices.find(v => v.lang === newLang)?.voice;
                      if (firstVoiceOfLang) setSelectedVoice(firstVoiceOfLang);
                    }
                  }}
                  className="w-full bg-[#1e293b]/60 text-slate-200 rounded-xl p-3 pr-10 appearance-none outline-none border border-slate-700 focus:border-indigo-500/50 text-sm font-medium transition-all"
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {getLanguageLabel(lang)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col min-h-0 border-t border-slate-800 pt-6">
              <label className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-3 block">
                {(useCloud && (selectedLang.startsWith('vi') || PRO_VOICES.some(v => selectedLang.startsWith(v.lang)))) ? 'Chọn Giọng Đọc' : 'Giọng Đọc Hệ Thống'}
              </label>
              
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                {/* Search & Filter */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <select 
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg py-1.5 px-2 text-[10px] outline-none"
                  >
                    <option value="all">Tất cả</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                {/* Voice Grid */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                  {(useCloud && (selectedLang.startsWith('vi') || PRO_VOICES.some(v => selectedLang.startsWith(v.lang)))) ? (
                    filteredProVoices.map((v) => (
                      <div 
                        key={v.id}
                        onClick={() => setSelectedProVoice(v)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer group relative ${
                          selectedProVoice.id === v.id 
                          ? 'bg-indigo-500/20 border-indigo-500 shadow-lg shadow-indigo-500/10' 
                          : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                            v.type === 'Nam' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                          }`}>
                            {v.type === 'Nam' ? '♂️ Nam' : '♀️ Nữ'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{v.id.split('-').pop()?.replace('Neural','')}</span>
                        </div>
                        <div className="text-sm font-semibold text-white mb-2">{v.name}</div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewVoice(v);
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
                              isPreviewLoading === v.id 
                              ? 'bg-slate-700 text-slate-500' 
                              : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white'
                            }`}
                          >
                            <Play size={10} fill="currentColor" />
                            {isPreviewLoading === v.id ? 'Đang tải...' : 'Nghe thử'}
                          </button>
                        </div>
                        {selectedProVoice.id === v.id && (
                          <motion.div layoutId="active-indicator" className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-500 rounded-r-full" />
                        )}
                      </div>
                    ))
                  ) : (
                    voices
                      .filter(v => v.lang === selectedLang)
                      .map((v) => (
                        <div 
                          key={v.name}
                          onClick={() => setSelectedVoice(v.voice)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            selectedVoice?.name === v.name 
                            ? 'bg-indigo-500/20 border-indigo-500 shadow-lg shadow-indigo-500/10' 
                            : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-sm font-semibold text-white truncate">{v.name}</div>
                          <div className="text-[10px] text-slate-500 uppercase mt-1">Giọng hệ thống</div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Audio Parameters */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <label className="text-[11px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                <Settings2 size={14} /> Hiệu Chỉnh
              </label>
              <button 
                onClick={handleReset}
                className="text-[10px] font-mono text-indigo-400/60 hover:text-indigo-400 uppercase tracking-tighter flex items-center gap-1 transition-colors"
                title="Đặt lại thông số"
              >
                <RotateCcw size={10} /> Reset
              </button>
            </div>

            <div className="space-y-6">
              {/* Volume */}
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><Volume2 size={12} /> Âm lượng</span>
                  <span className="text-indigo-400 font-bold">{Math.round(volume * 100)}%</span>
                </div>
                <div className="relative flex items-center h-4">
                  <input 
                    type="range" min="0" max="1" step="0.1" 
                    value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer hover:accent-indigo-400 transition-all"
                  />
                </div>
              </div>

              {/* Rate */}
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                  <span>Tốc Độ</span>
                  <span className="text-indigo-400 font-bold">{rate.toFixed(1)}x</span>
                </div>
                <div className="relative flex items-center h-4">
                  <input 
                    type="range" min="0.5" max="2" step="0.1" 
                    value={rate} onChange={(e) => setRate(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer hover:accent-indigo-400 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <label className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-3 block">Định Dạng Đầu Ra</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="py-2.5 px-3 bg-indigo-500/10 border border-indigo-500/40 text-center text-[10px] font-bold rounded-lg text-indigo-300 uppercase cursor-default">HTML5 WebAudio</div>
              <div className="py-2.5 px-3 bg-slate-800/40 border border-slate-700 text-center text-[10px] font-bold rounded-lg text-slate-600 uppercase cursor-not-allowed">MP3 Export</div>
            </div>
          </div>
        </aside>
      </main>
      
      {/* Status Bar / Footer */}
      <footer className="bg-[#0f172a] border-t border-slate-800 px-8 py-3 flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-[0.2em] z-10">
        <div className="flex gap-6 items-center">
          <span>FreeVoice TTS v1.1.0</span>
          <span className="hidden sm:inline">Máy chủ: Asia-East (Ổn định)</span>
          <span className="hidden sm:inline">Động cơ: WebSynth Core</span>
        </div>
        <div className="flex gap-4 items-center">
          <motion.div 
            animate={isSpeaking ? { opacity: [1, 0.4, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
            <span className="text-indigo-400 font-bold">AI Engine Đã Sẵn Sàng</span>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
