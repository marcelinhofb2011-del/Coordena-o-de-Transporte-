import React, { useState, useEffect } from 'react';
import { Clock, Trash2, Image as LucideImage, Unlock, CheckCircle, Save } from 'lucide-react';
import { useEvent } from '../../contexts/EventContext';

export const ScreenLockSection: React.FC = () => {
  const { countdownConfig, updateCountdownConfig } = useEvent();

  // Estados da Contagem Regressiva / Programação de Lançamento
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownTitle, setCountdownTitle] = useState('');
  const [countdownTargetDate, setCountdownTargetDate] = useState('');
  const [countdownImage, setCountdownImage] = useState('');
  const [countdownLiberated, setCountdownLiberated] = useState(false);
  const [savingCountdown, setSavingCountdown] = useState(false);
  const [countdownSuccess, setCountdownSuccess] = useState(false);

  useEffect(() => {
    if (countdownConfig) {
      setCountdownActive(countdownConfig.active || false);
      setCountdownTitle(countdownConfig.title || '');
      setCountdownTargetDate(countdownConfig.targetDate || '');
      setCountdownImage(countdownConfig.image || '');
      setCountdownLiberated(countdownConfig.liberated || false);
    }
  }, [countdownConfig]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setCountdownImage(compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCountdown = async () => {
    setSavingCountdown(true);
    try {
      await updateCountdownConfig({
        active: countdownActive,
        title: countdownTitle.trim(),
        targetDate: countdownTargetDate,
        image: countdownImage,
        liberated: countdownLiberated
      });
      setCountdownSuccess(true);
      setTimeout(() => setCountdownSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar programação:", err);
    } finally {
      setSavingCountdown(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      {/* CARTÃO: Contagem Regressiva e Bloqueio de Inscrições */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Header do Cartão */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between gap-2 select-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock size={15} />
            </div>
            <div>
              <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">Cronograma de Lançamento</h2>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold leading-none mt-0.5">
                Bloqueio prévio do sistema com contagem regressiva
              </p>
            </div>
          </div>

          {/* Badges de Status */}
          <div>
            {!countdownActive ? (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded border border-emerald-100 dark:border-emerald-900/30">
                SISTEMA LIVRE
              </span>
            ) : countdownLiberated ? (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-450 text-[9px] font-black uppercase tracking-wider rounded border border-blue-100 dark:border-blue-900/30">
                DESBLOQUEADO
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[9px] font-black uppercase tracking-wider rounded border border-amber-100 dark:border-amber-900/30 animate-pulse">
                BLOQUEADO
              </span>
            )}
          </div>
        </div>

        {/* Conteúdo do Cartão */}
        <div className="p-4 space-y-4">
          {/* Seção 1: Interruptor de Ativação Principal */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-955 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="space-y-0.5 pr-2">
              <label htmlFor="toggle-countdown-lock" className="text-[10px] font-bold text-slate-850 dark:text-slate-250 uppercase tracking-wider block cursor-pointer">Ativar Tela de Bloqueio</label>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-tight">
                Substitui o painel principal por um cronômetro regressivo profissional para todos os usuários normais.
              </p>
            </div>
            <label htmlFor="toggle-countdown-lock" className="relative inline-flex items-center cursor-pointer select-none shrink-0">
              <input 
                type="checkbox" 
                id="toggle-countdown-lock"
                checked={countdownActive}
                onChange={(e) => setCountdownActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {countdownActive && (
            <div className="space-y-4">
              
              {/* Divisor Visual: Detalhes do Lançamento */}
              <div className="pt-2.5 border-t border-slate-105 dark:border-slate-850/65">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2.5">
                  1. Detalhes Básicos e Horário
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Nome do Evento */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider ml-0.5 block flex items-center gap-1">
                      <span>📝</span> Título do Evento
                    </label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg outline-none text-[11px] font-bold text-slate-900 dark:text-white focus:border-amber-500 transition-all font-sans placeholder:font-medium placeholder:text-slate-450"
                      placeholder="Ex: Assembleia de Circuito - Sábado"
                      value={countdownTitle}
                      onChange={(e) => setCountdownTitle(e.target.value)}
                    />
                  </div>

                  {/* Data de Lançamento */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider ml-0.5 block flex items-center gap-1">
                      <span>📅</span> Data e Hora de Abertura
                    </label>
                    <input 
                      type="datetime-local"
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-lg outline-none text-[11px] font-bold text-slate-900 dark:text-white focus:border-amber-500 transition-all font-sans"
                      value={countdownTargetDate}
                      onChange={(e) => setCountdownTargetDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Divisor Visual: Identidade Visual / Imagem de Capa */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-850">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  2. Identidade Visual (Imagem de Capa)
                </span>
                
                {countdownImage ? (
                  <div className="relative border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-105 dark:bg-slate-950 aspect-video group shadow-inner">
                    <img 
                      src={countdownImage} 
                      alt="Layout de lançamento" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 flex gap-1 z-10">
                      <button
                        type="button"
                        onClick={() => setCountdownImage('')}
                        className="bg-red-600 hover:bg-red-700 active:scale-95 text-white p-2 rounded-lg shadow-lg transition-all flex items-center justify-center cursor-pointer border border-red-500"
                        title="Remover Imagem"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-250 dark:border-slate-800 hover:border-amber-500 dark:hover:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50 dark:bg-slate-950/30 text-slate-455 hover:text-amber-600 transition-all select-none">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 shadow-xs">
                      <LucideImage size={18} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider">Enviar Imagem de Capa</span>
                    <span className="text-[8.5px] text-slate-400/80 uppercase tracking-widest leading-none font-sans">Compactação Inteligente em Tempo Real (Zero Custo)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>

              {/* Divisor Visual: Liberação de Emergência */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-850">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">
                  3. Controle e Liberação Manual
                </span>

                <div className="p-3 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/35 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 pr-2">
                      <label htmlFor="toggle-manual-liberation" className="text-[10px] font-bold text-amber-800 dark:text-amber-455 uppercase tracking-wider block flex items-center gap-1 cursor-pointer">
                        <Unlock size={12} className="text-amber-500" /> Liberar Sem Contagem
                      </label>
                      <p className="text-[8.5px] text-amber-655 dark:text-amber-500/90 font-medium leading-tight">
                        Desbloqueia o aplicativo imediatamente para todos os usuários vinculados, ignorando o tempo restante.
                      </p>
                    </div>
                    <label htmlFor="toggle-manual-liberation" className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input 
                        type="checkbox" 
                        id="toggle-manual-liberation"
                        checked={countdownLiberated}
                        onChange={(e) => setCountdownLiberated(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-amber-200 dark:bg-amber-900/40 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer / Ações do Cartão */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3">
          <div>
            {countdownSuccess && (
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1 animate-fadeIn">
                <CheckCircle size={11} /> Configuração Salva!
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={savingCountdown}
            onClick={handleSaveCountdown}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer font-sans"
          >
            {savingCountdown ? (
              <div className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={11} />
                <span>Gravar Programação</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
