import React, { useState, useRef } from 'react';
import { Play, Pause, Download, Lock, FileImage, Headphones, MonitorPlay, ZoomIn } from 'lucide-react';

interface EvidencePlayerProps {
  tipo: 'texto' | 'imagen' | 'audio' | 'url' | 'video' | 'documento' | 'codigo';
  url: string;
  planUsuario: string;
  onDownload?: () => void;
}

export const EvidencePlayer: React.FC<EvidencePlayerProps> = ({ tipo, url, planUsuario }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const isDeleted = url.includes('[') || !url.startsWith('http');
  
  const canView = () => {
    const plan = planUsuario.toLowerCase();
    if (tipo === 'imagen') return ['pro', 'elite', 'admin'].includes(plan);
    if (['audio', 'video'].includes(tipo)) return ['elite', 'admin'].includes(plan);
    return false;
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  if (isDeleted) {
    return (
      <div className="w-full aspect-video bg-black/40 rounded-[32px] border border-white/5 flex flex-col items-center justify-center text-center p-8">
        <Lock className="text-white/20 w-8 h-8 mb-4" />
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Evidencia Eliminada</h4>
      </div>
    );
  }

  if (!canView()) {
    return (
      <div className="w-full aspect-video bg-black/40 rounded-[32px] border border-white/10 flex flex-col items-center justify-center text-center p-8 group">
        <Lock className="text-[var(--accent)] w-10 h-10 animate-pulse mb-4" />
        <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">Acceso Restringido</h4>
        <p className="text-[8px] text-[var(--accent)] uppercase font-black tracking-widest mt-2">Nivel {tipo === 'imagen' ? 'PRO' : 'ELITE'} requerido</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          {tipo === 'imagen' && <FileImage size={14} className="text-[var(--accent)]" />}
          {tipo === 'audio' && <Headphones size={14} className="text-[var(--accent)]" />}
          {tipo === 'video' && <MonitorPlay size={14} className="text-[var(--accent)]" />}
          <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]">Visualizador Forense</span>
        </div>
      </div>

      <div className="cyber-card p-1.5 border-[var(--border-color)] overflow-hidden bg-black/20">
        {tipo === 'imagen' && (
          <div className="relative group">
            <img src={url} alt="Forense" className="w-full rounded-xl grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in">
               <ZoomIn className="text-white w-10 h-10" />
            </div>
          </div>
        )}

        {tipo === 'audio' && (
          <div className="p-6 bg-gradient-to-br from-black/40 to-transparent rounded-xl flex flex-col items-center gap-6">
            {/* ONDA DE AUDIO CUSTOM */}
            <div className="w-full h-16 flex items-center justify-center gap-1.5 px-4 relative">
               <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-[var(--accent)] rounded-full ${isPlaying ? 'animate-ping' : ''}`}></div>
               {[...Array(30)].map((_, i) => (
                 <div 
                   key={i} 
                   className={`w-1.5 bg-[var(--accent)]/30 rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`} 
                   style={{ 
                     height: isPlaying ? `${20 + Math.random() * 80}%` : '20%',
                     animationDelay: `${i * 0.05}s`
                   }}
                 ></div>
               ))}
            </div>

            {/* BOTÓN DE PLAY CUSTOM (OCULTA LA BARRA BLANCA) */}
            <button 
              onClick={toggleAudio}
              className="w-16 h-16 bg-[var(--accent)] rounded-full flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 hover:scale-110 active:scale-95 transition-all group"
            >
              {isPlaying ? <Pause className="text-white fill-white" /> : <Play className="text-white fill-white ml-1" />}
            </button>
            
            <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden">
              <source src={url} type="audio/mpeg" />
            </audio>

            <span className="text-[8px] font-black text-[var(--text-muted)] tracking-widest uppercase">
              {isPlaying ? 'Reproduciendo Firma Vocal...' : 'Oído Forense Listo'}
            </span>
          </div>
        )}

        {tipo === 'video' && (
          <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
            <video controls className="w-full h-full object-contain">
              <source src={url} type="video/mp4" />
            </video>
          </div>
        )}
      </div>
    </div>
  );
};
