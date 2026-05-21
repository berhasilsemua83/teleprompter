import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, RotateCcw, Settings2, Edit3, Monitor, Camera, X,
  ArrowLeftRight, Type, Download, Upload, Maximize, Minimize,
  AlignLeft, AlignCenter, AlignRight, Check, SunMoon, PlayCircle, EyeOff, Eye,
  HelpCircle
} from 'lucide-react';

// --- TYPES ---
interface AppSettings {
  fontSize: number;
  speed: number;
  alignment: 'left' | 'center' | 'right';
  isMirrored: boolean;
  opacity: number;
  lineHeight: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 48,
  speed: 2,
  alignment: 'left',
  isMirrored: false,
  opacity: 100,
  lineHeight: 1.5,
};

const DEFAULT_SCRIPT = `Selamat datang di Teleprompter Akariu!

Aplikasi ini dirancang khusus untuk para konten kreator agar presentasi Anda lebih lancar.

• Scroll teks otomatis yang mulus
• Atur kecepatan & ukuran teks sesuka Anda
• Fitur Mirror Text (Pencerminan) untuk melihat dari kaca
• Picture-in-picture kamera depan untuk merekam
• Sembunyikan kontrol otomatis (Auto-hide)

Tekan tombol "Start Prompter" di atas untuk mencoba.`;

// --- HOOKS ---
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn('Error reading localStorage', error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn('Error setting localStorage', error);
    }
  };

  return [storedValue, setValue] as const;
}

// --- COMPONENTS ---

const CameraPreview: React.FC<{
  mode: 'camera' | 'screen' | 'none';
  onClose: () => void;
}> = ({ mode, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const startMedia = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        if (mode === 'camera') {
          // Include audio so the recording has sound!
          streamRef.current = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode }, 
            audio: true 
          });
        } else if (mode === 'screen') {
          streamRef.current = await navigator.mediaDevices.getDisplayMedia({ 
            video: true, 
            audio: true 
          });
        }
        
        if (videoRef.current && streamRef.current) {
          // Mute local video playback to prevent echoing
          videoRef.current.muted = true;
          videoRef.current.srcObject = streamRef.current;
        }
      } catch (err) {
        console.error('Failed to get media', err);
      }
    };

    if (mode !== 'none') {
      startMedia();
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode, facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleRecord = () => {
    if (!streamRef.current) return;

    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      // Start recording
      recordedChunksRef.current = [];
      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      
      try {
        const recorder = new MediaRecorder(streamRef.current, MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined);
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `recording-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start recording', err);
        alert('Gagal memulai rekaman. Browser mungkin tidak mendukung.');
      }
    }
  };

  if (mode === 'none') return null;

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, top: 0, right: window.innerWidth - 180, bottom: window.innerHeight - 240 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed z-50 w-36 h-52 sm:w-48 sm:h-64 bg-black/80 rounded-2xl overflow-hidden shadow-2xl border border-white/10 backdrop-blur-md flex flex-col"
      style={{ right: 20, top: 20 }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-transform duration-300 ${mode === 'camera' && facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
      />
      
      <div className="absolute top-2 right-2 flex flex-col gap-2">
        <button
          onClick={onClose}
          className="p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white/70 transition-colors"
          title="Tutup"
        >
          <X size={14} />
        </button>
      </div>

      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-black/40 backdrop-blur rounded-full px-2 py-1">
        <div className="text-[10px] font-mono font-medium text-white/70 flex items-center gap-1">
          {isRecording && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          {mode === 'camera' ? 'CAM' : 'SCR'}
        </div>
        
        <div className="flex items-center gap-1">
          {mode === 'camera' && (
            <button
              onClick={toggleCamera}
              className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Balik Kamera"
            >
              <ArrowLeftRight size={14} />
            </button>
          )}
          <button
            onClick={handleRecord}
            className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${isRecording ? 'text-red-500 hover:bg-red-500/20' : 'text-white hover:bg-white/20'}`}
            title={isRecording ? "Stop Rekam & Simpan" : "Mulai Rekam"}
          >
            <div className={`w-3 h-3 rounded-full border-2 ${isRecording ? 'border-red-500 bg-red-500' : 'border-white'}`} style={isRecording ? { borderRadius: '2px'} : {}} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const GuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative custom-scrollbar"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10 text-white/70">
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 pr-8">
          Cara Penggunaan Teleprompter Akariu
        </h2>
        
        <div className="space-y-6 text-white/80 text-sm sm:text-base">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2 mb-2"><Edit3 size={18} className="text-cyan-400" /> 1. Mode Editor</h3>
            <p className="pl-7 leading-relaxed">Ketik atau copy-paste naskah Anda di kolom text. Gunakan ikon <b>Upload</b> untuk memasukkan file .txt, atau ikon <b>Download</b> untuk menyimpan naskah saat ini ke komputer/HP Anda.</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2 mb-2"><PlayCircle size={18} className="text-cyan-400" /> 2. Memulai Prompter</h3>
            <p className="pl-7 leading-relaxed">Tekan tombol <span className="bg-cyan-500 px-2 py-0.5 rounded text-black font-semibold text-xs mx-1">Start Prompter</span> untuk mulai. Anda akan melihat hitung mundur (countdown) 3 detik, lalu naskah akan mulai berjalan secara otomatis.</p>
          </div>

          <div>
            <h3 className="font-semibold text-white flex items-center gap-2 mb-2"><Settings2 size={18} className="text-cyan-400" /> 3. Kontrol & Pengaturan</h3>
            <ul className="list-disc pl-11 space-y-2 leading-relaxed">
              <li><b>Auto-Hide:</b> Jika Anda diam selama membaca, panel kontrol di bawah akan otomatis bersembunyi. <b>Sentuh layar</b> atau gerakkan mouse untuk memunculkannya kembali.</li>
              <li><b>Settings:</b> Buka ikon Gerigi (<Settings2 size={14} className="inline opacity-80" />) untuk mengubah kecepatan scroll, ukuran font, opacity latar, dan <b>Mirror Text</b> (sangat berguna jika menggunakan kaca teleprompter sungguhan).</li>
              <li><b>Progress Bar:</b> Garis warna di atas menunjukkan sejauh mana Anda sudah membaca posisi naskah.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white flex items-center gap-2 mb-2"><Camera size={18} className="text-cyan-400" /> 4. Monitor & Kamera Preview</h3>
            <ul className="list-disc pl-11 space-y-2 leading-relaxed">
              <li>Tekan ikon <b>Kamera</b> (<Camera size={14} className="inline opacity-80" />) untuk menampilkan pratinjau wajah Anda (Kamera Depan).</li>
              <li>Tekan ikon <b>Monitor</b> (<Monitor size={14} className="inline opacity-80" />) untuk menangkap tampilan layar Anda (Screen Share). Pindahkan jendela pratinjau ke manapun di layar (bisa digeser / didrag).</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2 mb-2"><Maximize size={18} className="text-cyan-400" /> 5. Layar Penuh</h3>
            <p className="pl-7 leading-relaxed">Gunakan ikon Fullscreen agar pengalaman presentasi / konten kreator Anda lebih fokus, tanpa terganggu bilah URL browser.</p>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-full transition-all shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            Mengerti, Siap Mulai!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SettingsPanel: React.FC<{
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  onClose: () => void;
}> = ({ settings, setSettings, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-full mb-4 right-0 sm:right-0 w-[85vw] max-w-[280px] sm:max-w-sm sm:w-72 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl z-50 text-white/90"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-white">Settings</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4 text-xs font-medium">
        <div>
          <div className="flex justify-between mb-1">
            <span>Scroll Speed</span>
            <span>{settings.speed}x</span>
          </div>
          <input
            type="range" min="0.5" max="10" step="0.5"
            value={settings.speed}
            onChange={(e) => setSettings({ ...settings, speed: parseFloat(e.target.value) })}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span>Text Size</span>
            <span>{settings.fontSize}px</span>
          </div>
          <input
             type="range" min="20" max="120" step="2"
             value={settings.fontSize}
             onChange={(e) => setSettings({ ...settings, fontSize: parseInt(e.target.value) })}
             className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
          <span>Mirror Text</span>
          <button
            onClick={() => setSettings({ ...settings, isMirrored: !settings.isMirrored })}
            className={`p-1.5 rounded-lg transition-colors ${settings.isMirrored ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 text-white/60'}`}
          >
            <ArrowLeftRight size={16} />
          </button>
        </div>

        <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
          <span>Alignment</span>
          <div className="flex gap-1">
            {[
              { id: 'left', Icon: AlignLeft },
              { id: 'center', Icon: AlignCenter },
              { id: 'right', Icon: AlignRight }
            ].map(({ id, Icon }) => (
              <button
                key={id}
                onClick={() => setSettings({ ...settings, alignment: id as any })}
                className={`p-1.5 rounded-lg transition-colors ${settings.alignment === id ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/60 hover:bg-white/10'}`}
              >
                 <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span>Opacity</span>
            <span>{settings.opacity}%</span>
          </div>
          <input
             type="range" min="20" max="100" step="5"
             value={settings.opacity}
             onChange={(e) => setSettings({ ...settings, opacity: parseInt(e.target.value) })}
             className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>
    </motion.div>
  );
};


// --- MAIN APP COMPONENT ---

export default function App() {
  const [mode, setMode] = useState<'edit' | 'prompt'>('edit');
  const [script, setScript] = useLocalStorage('teleprompter_script', DEFAULT_SCRIPT);
  const [settings, setSettings] = useLocalStorage<AppSettings>('teleprompter_settings', DEFAULT_SETTINGS);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraMode, setCameraMode] = useState<'none' | 'camera' | 'screen'>('none');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedScrollPos = useRef<number>(0);

  // Focus tracking for auto-hide
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && mode === 'prompt') {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
    }
  }, [isPlaying, mode]);

  useEffect(() => {
    window.addEventListener('mousemove', resetControlsTimeout);
    window.addEventListener('touchstart', resetControlsTimeout);
    return () => {
      window.removeEventListener('mousemove', resetControlsTimeout);
      window.removeEventListener('touchstart', resetControlsTimeout);
    };
  }, [resetControlsTimeout]);

  useEffect(() => {
    resetControlsTimeout();
  }, [isPlaying, mode, resetControlsTimeout]);


  // 60FPS DOM update for progress bar to avoid re-renders
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const updateProgress = useCallback(() => {
    if (scrollContainerRef.current && progressBarRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      savedScrollPos.current = scrollTop;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      progressBarRef.current.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }
  }, []);

  // Smooth Auto Scroll Engine
  const animateScroll = useCallback(() => {
    if (isPlaying && scrollContainerRef.current) {
      // Magic number for base speed adjusted by standard typical prompter speed
      const scrollAmount = settings.speed * 0.4;
      scrollContainerRef.current.scrollTop += scrollAmount;
      updateProgress();
      
      // Stop if reached bottom
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 5) {
        setIsPlaying(false);
        return;
      }
    }
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animateScroll);
    }
  }, [isPlaying, settings.speed, updateProgress]);

  useEffect(() => {
    if (isPlaying && countdown === 0) {
      requestRef.current = requestAnimationFrame(animateScroll);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, countdown, animateScroll]);

  useEffect(() => {
    if (mode === 'prompt' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = savedScrollPos.current;
      requestAnimationFrame(() => updateProgress());
    }
  }, [mode, updateProgress]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // Hapus countdown saat pause/play agar resume langsung jalan
    if (countdown > 0) setCountdown(0);
  };

  const handleReset = () => {
    setIsPlaying(false);
    savedScrollPos.current = 0;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      updateProgress();
    }
    setCountdown(3);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch((err) => console.log(err));
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch((err) => console.log(err));
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      if (countdown === 1) {
        setTimeout(() => setIsPlaying(true), 1000);
      }
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleExport = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teleprompter_script.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setScript(e.target?.result as string);
      reader.readAsText(file);
    }
  };

  // Calculating script stats
  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  // 150 words per minute average reading speed
  const estimatedMin = Math.floor(wordCount / 150);
  const estimatedSec = Math.floor((wordCount % 150) / (150 / 60));

  return (
    <div className="w-full min-h-screen bg-black text-white font-sans overflow-hidden selection:bg-cyan-500/40">
      
      {/* --- GUIDE MODAL --- */}
      <AnimatePresence>
        {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      </AnimatePresence>

      {/* --- CAMERA PREVIEWS --- */}
      <AnimatePresence>
        {cameraMode !== 'none' && (
          <CameraPreview mode={cameraMode} onClose={() => setCameraMode('none')} />
        )}
      </AnimatePresence>

      {/* --- COUNTDOWN OVERLAY --- */}
      <AnimatePresence>
        {countdown > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-9xl font-black italic tracking-tighter bg-gradient-to-br from-cyan-400 to-purple-500 bg-clip-text text-transparent"
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* --- MODE SWITCH: EDITOR vs PROMPTER --- */}
      {mode === 'edit' ? (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="max-w-4xl mx-auto h-screen flex flex-col p-4 sm:p-8"
        >
          <header className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4 sm:mb-6">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-start">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shrink-0">
                <PlayCircle className="text-white" size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tight truncate">Teleprompter<span className="font-light text-white/50">Akariu</span></h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              <button 
                onClick={() => setShowGuide(true)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/70"
                title="Cara Penggunaan"
              >
                <HelpCircle size={18} />
              </button>
              <label className="p-2 cursor-pointer rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/70" title="Upload Script (.txt)">
                <Upload size={18} />
                <input type="file" accept=".txt" onChange={handleImport} className="hidden" />
              </label>
              <button 
                onClick={handleExport}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/70"
                title="Download Script (.txt)"
              >
                <Download size={18} />
              </button>
              <button
                onClick={() => {
                  setMode('prompt');
                  // Jangan panggil handleReset() agar melanjutkan dari posisi terakhir
                  // Kecuali jika sebelumnya belum set sama sekali
                  if (savedScrollPos.current === 0) {
                    setCountdown(3);
                  }
                }}
                className="px-6 py-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] flex items-center gap-2 shrink-0"
              >
                Start Prompter <Play size={16} className="fill-current" />
              </button>
            </div>
          </header>

          <div className="flex-1 relative rounded-3xl bg-white/[0.03] border border-white/10 overflow-hidden shadow-2xl flex flex-col focus-within:border-cyan-500/50 transition-colors duration-300">
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Start typing your script here..."
              className="flex-1 w-full p-6 sm:p-10 bg-transparent text-white/90 text-lg sm:text-xl leading-relaxed resize-none outline-none font-medium placeholder:text-white/20"
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent pointer-events-none flex justify-between items-end">
              <div className="flex gap-4 text-xs font-mono text-cyan-400/80 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>~{estimatedMin}m {estimatedSec}s read</span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* --- PROMPTER MODE --- */
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="h-screen w-full flex relative pb-24"
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/10 z-50 pointer-events-none">
            <div 
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-r-full transition-all duration-100"
              style={{ width: '0%' }}
            />
          </div>

          {/* Scroll Area */}
          <div 
            ref={scrollContainerRef}
            onScroll={updateProgress}
            onClick={() => {
              handlePlayPause();
              resetControlsTimeout();
            }}
            className="w-full h-full overflow-y-auto overflow-x-hidden pt-[50vh] pb-[50vh] px-4 sm:px-12 md:px-24 scroll-smooth hide-scrollbar cursor-pointer"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              transform: settings.isMirrored ? 'scaleX(-1)' : 'none'
            }}
          >
            <div 
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                textAlign: settings.alignment,
                opacity: settings.opacity / 100,
              }}
              className="max-w-3xl mx-auto font-bold tracking-tight text-white/90 whitespace-pre-wrap transition-all duration-300 pointer-events-none font-sans"
            >
              {script}
            </div>
          </div>

          {/* Reading Indicator Marker (Center Line) */}
          <div className="absolute top-1/2 left-0 right-0 h-0 border-t border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-10 pointer-events-none" />
          <div className="absolute top-1/2 left-4 w-4 h-4 -translate-y-1/2 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.8)] z-10 pointer-events-none" />

          {/* Floating Control Bar */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-black/60 backdrop-blur-2xl border border-white/10 p-3 sm:p-4 rounded-3xl shadow-2xl flex items-center justify-between z-40 transition-all"
              >
                {/* Left Actions */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setMode('edit');
                    }}
                    className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white group relative shrink-0"
                  >
                    <Edit3 size={18} className="sm:w-5 sm:h-5" />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Edit</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white shrink-0"
                  >
                    <RotateCcw size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Primary Play/Pause Action */}
                <button
                  onClick={handlePlayPause}
                  className="w-14 h-14 sm:w-20 sm:h-20 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full flex mx-2 sm:mx-4 items-center justify-center shrink-0 shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-transform active:scale-95"
                >
                  {isPlaying ? (
                    <Pause size={24} className="sm:w-8 sm:h-8 fill-current" />
                  ) : (
                    <Play size={24} className="sm:w-8 sm:h-8 fill-current ml-1 sm:ml-2" />
                  )}
                </button>

                {/* Right Actions */}
                <div className="flex items-center gap-1 sm:gap-2 relative">
                  <button
                    onClick={() => setCameraMode(prev => prev === 'camera' ? 'none' : 'camera')}
                    className={`p-2 sm:p-3 rounded-full transition-colors flex shrink-0 ${cameraMode === 'camera' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                  >
                    <Camera size={18} className="sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setCameraMode(prev => prev === 'screen' ? 'none' : 'screen')}
                    className={`p-2 sm:p-3 rounded-full transition-colors hidden sm:flex shrink-0 ${cameraMode === 'screen' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                  >
                    <Monitor size={18} className="sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 sm:p-3 rounded-full transition-colors bg-white/10 hover:bg-white/20 text-white hidden sm:flex shrink-0"
                  >
                    {isFullscreen ? <Minimize size={18} className="sm:w-5 sm:h-5" /> : <Maximize size={18} className="sm:w-5 sm:h-5" />}
                  </button>
                  
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className={`p-2 sm:p-3 rounded-full transition-colors shrink-0 ${showSettings ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                    >
                      <Settings2 size={18} className="sm:w-5 sm:h-5" />
                    </button>

                    <AnimatePresence>
                      {showSettings && (
                        <SettingsPanel 
                           settings={settings} 
                           setSettings={setSettings} 
                           onClose={() => setShowSettings(false)} 
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Global styles for hiding scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
}

