import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogOut, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { logout } from '../services/firebase';
import { CountdownConfig } from '../contexts/EventContext';

interface CountdownViewProps {
  config: CountdownConfig;
}

export const CountdownView: React.FC<CountdownViewProps> = ({ config }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOver: false
  });

  useEffect(() => {
    const target = new Date(config.targetDate).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isOver: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [config.targetDate]);

  const formattedEventDate = (() => {
    try {
      if (!config.targetDate) return '';
      const dateObj = new Date(config.targetDate);
      return dateObj.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  })();

  const timeBlocks = [
    { label: 'dias', value: timeLeft.days },
    { label: 'horas', value: timeLeft.hours },
    { label: 'minutos', value: timeLeft.minutes },
    { label: 'segundos', value: timeLeft.seconds }
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 md:p-6 transition-colors duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Left column / Top image block */}
        <div className="w-full md:w-5/12 bg-slate-50 dark:bg-slate-950/40 relative flex items-center justify-center min-h-[180px] md:min-h-full border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
          {config.image ? (
            <img 
              src={config.image} 
              alt={config.title || "Programação de Evento"} 
              className="w-full h-full object-cover absolute inset-0" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-350 dark:text-slate-600 p-6 text-center space-y-2 select-none">
              <div className="w-12 h-12 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Assembleia / Congresso</p>
            </div>
          )}
        </div>

        {/* Right column / Content details */}
        <div className="w-full md:w-7/12 p-6 md:p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/30">
                Lançamento Oficial
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {config.title || "Programação de Novo Evento"}
              </h1>
              {formattedEventDate && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formattedEventDate}
                </p>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-100 dark:border-slate-850/60 rounded">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider mb-2.5">
                Início das Inscrições Em:
              </p>
              
              <div className="grid grid-cols-4 gap-2">
                {timeBlocks.map((block) => (
                  <div key={block.label} className="flex flex-col items-center p-2 bg-white dark:bg-slate-900 border border-slate-200/55 dark:border-slate-800 rounded shadow-xs">
                    <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-mono leading-none">
                      {String(block.value).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold mt-1">
                      {block.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border-l-4 border-amber-500 flex items-start gap-2.5 rounded-r">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5 text-[11px] leading-relaxed font-medium">
                <p className="font-bold">Acesso Temporariamente Suspenso</p>
                <p className="text-amber-700/85 dark:text-amber-400/85">
                  As reservas de ônibus com poltronas livres estão desativadas. O sistema será liberado automaticamente após a contagem finalizar.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 hover:text-slate-900 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider rounded transition-all shadow-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              Sair do Sistema
            </button>
            <span className="text-[9px] text-slate-400 font-mono">
              v1.5.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
