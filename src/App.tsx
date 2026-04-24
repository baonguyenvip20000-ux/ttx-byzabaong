/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
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

export default function App() {
  const [text, setText] = useState('');
  const [languages, setLanguages] = useState<string[]>(['vi-VN', 'en-US', 'en-GB', 'en-AU', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES', 'zh-CN', 'id-ID', 'th-TH', 'ru-RU']);
  const [selectedLang, setSelectedLang] = useState('vi-VN');
  const useCloud = true; // Always use cloud now
  const [cloudAudioUrl, setCloudAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const PRO_VOICES = [
    // Vietnam
    { id: 'vi-VN-HoaiMyNeural', name: 'Giọng Google (Việt Nam)', lang: 'vi', quality: 'Ưu việt', type: 'Nữ', country: 'Vietnam' },
    
    // International (Edge Neural)
    { id: 'en-US-AvaNeural', name: 'Giọng Google (Mỹ)', lang: 'en', quality: 'AI Neural', type: 'Nữ', country: 'USA' },
    { id: 'en-GB-SoniaNeural', name: 'Giọng Google (Anh)', lang: 'en', quality: 'AI Neural', type: 'Nữ', country: 'UK' },
    { id: 'en-AU-NatashaNeural', name: 'Giọng Google (Úc)', lang: 'en', quality: 'AI Neural', type: 'Nữ', country: 'Australia' },
    { id: 'ja-JP-NanamiNeural', name: 'Giọng Google (Nhật Bản)', lang: 'ja', quality: 'AI Neural', type: 'Nữ', country: 'Japan' },
    { id: 'ko-KR-SunHiNeural', name: 'Giọng Google (Hàn Quốc)', lang: 'ko', quality: 'AI Neural', type: 'Nữ', country: 'Korea' },
    { id: 'fr-FR-DeniseNeural', name: 'Giọng Google (Pháp)', lang: 'fr', quality: 'AI Neural', type: 'Nữ', country: 'France' },
    { id: 'de-DE-KatjaNeural', name: 'Giọng Google (Đức)', lang: 'de', quality: 'AI Neural', type: 'Nữ', country: 'Germany' },
    { id: 'es-ES-ElviraNeural', name: 'Giọng Google (Tây Ban Nha)', lang: 'es', quality: 'AI Neural', type: 'Nữ', country: 'Spain' },
    { id: 'es-MX-DaliaNeural', name: 'Giọng Google (Mexico)', lang: 'es', quality: 'AI Neural', type: 'Nữ', country: 'Mexico' },
    { id: 'zh-CN-XiaoxiaoNeural', name: 'Giọng Google (Trung Quốc)', lang: 'zh', quality: 'AI Neural', type: 'Nữ', country: 'China' },
    { id: 'zh-TW-HsiaoChenNeural', name: 'Giọng Google (Đài Loan)', lang: 'zh', quality: 'AI Neural', type: 'Nữ', country: 'Taiwan' },
    { id: 'id-ID-GadisNeural', name: 'Giọng Google (Indonesia)', lang: 'id', quality: 'AI Neural', type: 'Nữ', country: 'Indonesia' },
    { id: 'th-TH-PremwadeeNeural', name: 'Giọng Google (Thái Lan)', lang: 'th', quality: 'AI Neural', type: 'Nữ', country: 'Thailand' },
    { id: 'ar-SA-ZariyahNeural', name: 'Giọng Google (Ả Rập)', lang: 'ar', quality: 'AI Neural', type: 'Nữ', country: 'Saudi Arabia' },
    { id: 'ru-RU-SvetlanaNeural', name: 'Giọng Google (Nga)', lang: 'ru', quality: 'AI Neural', type: 'Nữ', country: 'Russia' },
    { id: 'it-IT-ElsaNeural', name: 'Giọng Google (Ý)', lang: 'it', quality: 'AI Neural', type: 'Nữ', country: 'Italy' },
    { id: 'pt-BR-FranciscaNeural', name: 'Giọng Google (Brazil)', lang: 'pt', quality: 'AI Neural', type: 'Nữ', country: 'Brazil' },
  ];

  const [selectedProVoice, setSelectedProVoice] = useState(PRO_VOICES[0]);

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

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<string | null>(null);

  // Automatically update selectedProVoice when language changes
  useEffect(() => {
    const firstProVoiceOfLang = PRO_VOICES.find(v => selectedLang.startsWith(v.lang));
    if (firstProVoiceOfLang) {
      setSelectedProVoice(firstProVoiceOfLang);
    }
  }, [selectedLang]);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Reactive playback rate for audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, [rate]);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentWord, setCurrentWord] = useState('');

  useEffect(() => {
    // Only load languages from PRO_VOICES
    const uniqueLangs = Array.from(new Set(['vi-VN', 'en-US', 'en-GB', 'en-AU', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE', 'es-ES', 'zh-CN', 'id-ID', 'th-TH', 'ru-RU', 'ar-SA', 'ru-RU', 'it-IT', 'pt-BR'])).sort((a, b) => {
      const aIsVi = a.toLowerCase().includes('vi');
      const bIsVi = b.toLowerCase().includes('vi');
      if (aIsVi && !bIsVi) return -1;
      if (!aIsVi && bIsVi) return 1;
      return a.localeCompare(b);
    });
    
    setLanguages(uniqueLangs);
    setSelectedLang('vi-VN');
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
    if (!text) return;

    try {
      setIsSpeaking(true);
      
      const maxChars = 5000;
      const textToSpeak = text.length > maxChars ? text.slice(0, maxChars) : text;
      const proxyUrl = `/api/tts-proxy?text=${encodeURIComponent(textToSpeak)}&lang=${selectedProVoice.lang}&voiceId=${selectedProVoice.id}&volume=${volume}&cb=${Date.now()}`;
      
      setCloudAudioUrl(proxyUrl);
      if (audioRef.current) {
        audioRef.current.volume = volume;
        audioRef.current.playbackRate = rate; 
        audioRef.current.pause();
        audioRef.current.src = proxyUrl;
        audioRef.current.load();
        
        audioRef.current.oncanplay = () => {
          if (audioRef.current) {
            audioRef.current.playbackRate = rate;
          }
        };

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            if (error.name !== 'AbortError') {
              console.error("Playback failed", error instanceof Error ? error.message : "Unknown error");
            }
          });
        }

        audioRef.current.onended = () => {
          setIsSpeaking(false);
          setCurrentWord('');
        };
      }
    } catch (e) {
      console.error("TTS Error", e instanceof Error ? e.message : "Unknown error");
      setIsSpeaking(false);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      if (isSpeaking) {
        audioRef.current.pause();
        setIsSpeaking(false);
        setIsPaused(true);
      } else if (isPaused) {
        audioRef.current.play();
        setIsSpeaking(true);
        setIsPaused(false);
      }
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
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

      // Fallback: use base language if full code not found
      const baseLang = voice.lang.split('-')[0];
      const previewText = samples[voice.lang] || samples[baseLang] || "Hello, this is a sample text.";
      const url = `/api/tts-proxy?text=${encodeURIComponent(previewText)}&lang=${voice.lang}&voiceId=${voice.id}&rate=1&volume=1&cb=${Date.now()}`;
      
      if (previewAudioRef.current) {
        previewAudioRef.current.src = url;
        previewAudioRef.current.load();
        previewAudioRef.current.playbackRate = 1;
        await previewAudioRef.current.play();
      }
    } catch (error) {
      console.error("Preview failed", error);
    } finally {
      setIsPreviewLoading(null);
    }
  };

  const filteredProVoices = PRO_VOICES.filter(v => {
    const matchesLang = selectedLang.startsWith(v.lang);
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGender = genderFilter === 'all' || v.type === genderFilter;
    return matchesLang && matchesSearch && matchesGender;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col font-sans overflow-hidden">
      <audio ref={previewAudioRef} className="hidden" onCanPlay={(e) => {
        (e.target as HTMLAudioElement).playbackRate = 1;
      }} />
      <audio 
        ref={audioRef} 
        className="hidden" 
        onError={(e) => {
          const target = e.target as HTMLAudioElement;
          const error = target.error;
          console.error("Audio Load Error:", error?.code);
          setIsSpeaking(false);
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
              {isSpeaking ? 'Đang phát' : 'Đang chờ'}
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
              {text.length.toLocaleString()} / 5,000 ký tự
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
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/40 rounded-xl">
              <label className="text-[11px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2 mb-1">
                <Mic2 size={14} className="text-indigo-400" /> Chế độ giọng đọc
              </label>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Đang sử dụng Cloud Voice: Giọng đọc AI chuyên nghiệp nhất hiện nay.
              </p>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-3 block flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Languages size={14} /> Khu vực & Ngôn Ngữ</span>
              </label>
              <div className="relative">
                <select 
                  value={selectedLang}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setSelectedLang(newLang);
                    const match = PRO_VOICES.find(v => newLang.startsWith(v.lang));
                    if (match) setSelectedProVoice(match);
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
                Chọn Giọng Đọc AI
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
                  {filteredProVoices.map((v) => (
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
                          {isPreviewLoading === v.id ? 'Loading...' : 'Nghe thử'}
                        </button>
                      </div>
                      {selectedProVoice.id === v.id && (
                        <motion.div layoutId="active-indicator" className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-500 rounded-r-full" />
                      )}
                    </div>
                  ))}
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
