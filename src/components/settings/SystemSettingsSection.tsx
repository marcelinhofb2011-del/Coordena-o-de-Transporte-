import React, { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Save, CheckCircle } from 'lucide-react';
import { db } from '../../services/firebase';
import { useEvent } from '../../contexts/EventContext';

export const SystemSettingsSection: React.FC = () => {
  const { events, activeEventId } = useEvent();

  // Active pricing states
  const [ticketPrice, setTicketPrice] = useState<number>(0);
  const [dailyPrices, setDailyPrices] = useState<{ [day: string]: number }>({
    'Sexta': 0,
    'Sábado': 0,
    'Domingo': 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activePriceMode, setActivePriceMode] = useState<'unico' | 'diario'>('diario');

  const activeEvent = events.find(e => e.id === activeEventId);
  const isActiveAssembleia = activeEvent?.eventType === 'assembleia';

  // Load current global configuration
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const basePrice = data.ticketPrice || 0;
        setTicketPrice(basePrice);
        setDailyPrices(data.dailyPrices || {
          'Sexta': basePrice || 42,
          'Sábado': basePrice || 36,
          'Domingo': basePrice || 36
        });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Automatically update the price mode of the active event when it or prices load
  useEffect(() => {
    if (activeEvent) {
      if (activeEvent.eventType === 'assembleia') {
        setActivePriceMode('unico');
      } else if (dailyPrices) {
        const allEqual = dailyPrices['Sexta'] === dailyPrices['Sábado'] && dailyPrices['Sábado'] === dailyPrices['Domingo'];
        setActivePriceMode(allEqual ? 'unico' : 'diario');
      }
    }
  }, [activeEventId, events]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalDailyPrices = { ...dailyPrices };

      if (isActiveAssembleia && activeEvent?.assemblyDay) {
        finalDailyPrices = {
          'Sexta': activeEvent.assemblyDay === 'Sexta' ? ticketPrice : 0,
          'Sábado': activeEvent.assemblyDay === 'Sábado' ? ticketPrice : 0,
          'Domingo': activeEvent.assemblyDay === 'Domingo' ? ticketPrice : 0
        };
      } else if (activePriceMode === 'unico') {
        finalDailyPrices = {
          'Sexta': ticketPrice,
          'Sábado': ticketPrice,
          'Domingo': ticketPrice
        };
      }

      // Sync the new prices back into the active event so the event's snapshot values are aligned
      const updatedEvents = events.map(e => {
        if (e.id === activeEventId) {
          return {
            ...e,
            ticketPrice,
            dailyPrices: finalDailyPrices
          };
        }
        return e;
      });

      await setDoc(doc(db, 'settings', 'global'), { 
        ticketPrice,
        dailyPrices: finalDailyPrices,
        events: updatedEvents
      }, { merge: true });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-850">
          <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">Gestão Tarifária do Evento Ativo</h2>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold leading-none mt-0.5">
            Defina os preços padrão das passagens do evento e o valor de fallback do sistema
          </p>
        </div>

        {/* Conteúdo */}
        <div className="p-4 space-y-4">
          <div className="bg-amber-50/20 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-100/50 dark:border-slate-800/80 flex items-start gap-2.5">
            <div className="text-amber-700 dark:text-amber-400 text-[14px] mt-0.5">ℹ️</div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-white leading-none">Evento com Vendas Ativas</h4>
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mt-1">
                {activeEvent ? activeEvent.name : 'Nenhum evento ativo selecionado'}
              </p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-normal mt-0.5 font-sans">
                Modifique as tarifas abaixo. Elas serão sincronizadas com este evento e passarão a ser cobradas de novos passageiros.
              </p>
            </div>
          </div>

          {/* Pricing mode structure selection */}
          {!isActiveAssembleia ? (
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-0.5 block">Estrutura de Preços do Congresso</label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-50 dark:bg-slate-955 rounded-lg border border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActivePriceMode('unico')}
                  className={`py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
                    activePriceMode === 'unico'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-405 hover:text-slate-655 dark:hover:text-slate-350'
                  }`}
                >
                  Preço Único (Igual para todos os dias)
                </button>
                <button
                  type="button"
                  onClick={() => setActivePriceMode('diario')}
                  className={`py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
                    activePriceMode === 'diario'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-405 hover:text-slate-655 dark:hover:text-slate-350'
                  }`}
                >
                  Preço por Dia (Customizado)
                </button>
              </div>
            </div>
          ) : null}

          {/* Inputs */}
          <div className="space-y-4 pt-1">
            {isActiveAssembleia || activePriceMode === 'unico' ? (
              /* Single Price View */
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-0.5 block">
                  {isActiveAssembleia ? `Preço da Inscrição Única (${activeEvent?.assemblyDay})` : 'Preço Único das Passagens (R$)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[11px] font-black text-slate-900 dark:text-white focus:border-amber-500 transition-all font-mono"
                    value={ticketPrice === 0 ? '' : ticketPrice}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setTicketPrice(val);
                    }}
                    placeholder="0,00"
                  />
                </div>
                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                  {isActiveAssembleia 
                    ? 'Tarifa única do evento de Assembleia. Inscrições cobrarão este valor padrão.'
                    : 'Este valor será replicado para todos os dias do congresso (Sexta, Sábado e Domingo) ao salvar.'
                  }
                </p>
              </div>
            ) : (
              /* Custom Daily Prices View */
              <div className="space-y-4">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Valores Customizados por Dia (R$)</span>
                <div className="grid grid-cols-3 gap-3">
                  {/* Sexta */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-505 uppercase tracking-widest ml-0.5 block">Sexta</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pl-6 pr-1.5 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[11px] font-black text-slate-900 dark:text-white focus:border-amber-500 transition-all font-mono"
                        value={dailyPrices['Sexta'] === 0 ? '' : dailyPrices['Sexta']}
                        onChange={(e) => setDailyPrices({ ...dailyPrices, 'Sexta': e.target.value === '' ? 0 : Number(e.target.value) })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  {/* Sábado */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-505 uppercase tracking-widest ml-0.5 block">Sábado</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pl-6 pr-1.5 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[11px] font-black text-slate-900 dark:text-white focus:border-amber-500 transition-all font-mono"
                        value={dailyPrices['Sábado'] === 0 ? '' : dailyPrices['Sábado']}
                        onChange={(e) => setDailyPrices({ ...dailyPrices, 'Sábado': e.target.value === '' ? 0 : Number(e.target.value) })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  {/* Domingo */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-505 uppercase tracking-widest ml-0.5 block">Domingo</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pl-6 pr-1.5 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[11px] font-black text-slate-900 dark:text-white focus:border-amber-500 transition-all font-mono"
                        value={dailyPrices['Domingo'] === 0 ? '' : dailyPrices['Domingo']}
                        onChange={(e) => setDailyPrices({ ...dailyPrices, 'Domingo': e.target.value === '' ? 0 : Number(e.target.value) })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>

                {/* Base/Fallback */}
                <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-0.5 block">Preço Base de Vagas Individuais (Fallback / Avulsa)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full pl-7 pr-1.5 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[11px] font-black text-slate-900 dark:text-white focus:border-amber-500 transition-all font-mono"
                      value={ticketPrice === 0 ? '' : ticketPrice}
                      onChange={(e) => setTicketPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-3">
          <div>
            {success && (
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1 animate-fadeIn">
                <CheckCircle size={11} /> Tarifas Gravadas com Sucesso!
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer font-sans"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={11} />
                <span>Gravar Tarifas</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
