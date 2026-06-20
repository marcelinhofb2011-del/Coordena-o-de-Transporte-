import React, { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Save, DollarSign, Shield, Calendar, Plus, X } from 'lucide-react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';
import { UserRole } from '../types';

const SettingsView: React.FC = () => {
  const { appUser } = useAuth();
  const { events, activeEventId, addEvent, updateEvent, setActiveEvent, deleteEvent } = useEvent();
  
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

  // New Event Forms States (with custom pricing parameters)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventMode, setNewEventMode] = useState<'congresso' | 'assembleia'>('congresso');
  const [newAssemblyDay, setNewAssemblyDay] = useState<string>('Sábado');
  const [newCongressPriceMode, setNewCongressPriceMode] = useState<'unico' | 'diario'>('unico');
  
  const [newEventPrice, setNewEventPrice] = useState<number>(0);
  const [newEventDailySexta, setNewEventDailySexta] = useState<number>(0);
  const [newEventDailySabado, setNewEventDailySabado] = useState<number>(0);
  const [newEventDailyDomingo, setNewEventDailyDomingo] = useState<number>(0);
  const [eventError, setEventError] = useState<string | null>(null);

  // Edit Event Form States
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventName, setEditEventName] = useState('');
  const [editEventMode, setEditEventMode] = useState<'congresso' | 'assembleia'>('congresso');
  const [editAssemblyDay, setEditAssemblyDay] = useState<string>('Sábado');
  const [editCongressPriceMode, setEditCongressPriceMode] = useState<'unico' | 'diario'>('unico');
  
  const [editEventPrice, setEditEventPrice] = useState<number>(0);
  const [editEventDailySexta, setEditEventDailySexta] = useState<number>(0);
  const [editEventDailySabado, setEditEventDailySabado] = useState<number>(0);
  const [editEventDailyDomingo, setEditEventDailyDomingo] = useState<number>(0);
  const [editEventError, setEditEventError] = useState<string | null>(null);

  // Inline delete confirmation state
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const [activePriceMode, setActivePriceMode] = useState<'unico' | 'diario'>('diario');

  const activeEvent = events.find(e => e.id === activeEventId);
  const isActiveAssembleia = activeEvent?.eventType === 'assembleia';

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

  // Load current global configuration
  useEffect(() => {
    if (appUser?.role !== UserRole.ADMIN) return;
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
  }, [appUser]);

  // Pre-populate new event's fields with current system parameters as initial defaults
  useEffect(() => {
    if (ticketPrice > 0 && newEventPrice === 0) {
      setNewEventPrice(ticketPrice);
    }
    if (dailyPrices['Sexta'] > 0 && newEventDailySexta === 0) {
      setNewEventDailySexta(dailyPrices['Sexta']);
      setNewEventDailySabado(dailyPrices['Sábado']);
      setNewEventDailyDomingo(dailyPrices['Domingo']);
    }
  }, [ticketPrice, dailyPrices]);

  if (appUser?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center border border-rose-100 dark:border-rose-900/40">
          <Shield size={22} />
        </div>
        <h2 className="text-base font-black text-slate-900 dark:text-white">Acesso Restrito</h2>
        <p className="text-slate-500 text-[11px] max-w-xs font-medium leading-relaxed">
          Configurações globais do sistema são restritas a administradores do sistema.
        </p>
      </div>
    );
  }

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

  if (loading) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-5 px-3 pb-8">
      {/* Redesigned Minimal & Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-slate-850 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Configurações Gerais</h1>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[9px]">Gestão Tarifária e de Congressos / Assembleias</p>
        </div>
        
        {/* Save Action */}
        <div className="flex items-center gap-3">
          {success && (
            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest animate-pulse">✓ Salvo</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-wider rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white dark:border-slate-900/20 dark:border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <>
                <Save size={12} />
                <span>Salvar Tarifas Ativas</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COL 1: Active Event Pricing Fields (Span 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <DollarSign size={14} />
               </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">Tarifas do Evento Ativo</h2>
                  {isActiveAssembleia && (
                    <span className="text-[8px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-extrabold uppercase px-1.5 py-0.5 rounded">Assembleia</span>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold leading-none mt-0.5">
                  {isActiveAssembleia ? `Configurado para a Assembleia de ${activeEvent?.assemblyDay}` : 'Preços aplicados atualmente nas novas inscrições'}
                </p>
              </div>
            </div>

            {/* If it's a Congress, let them toggle between Single Price or Custom Daily Prices */}
            {!isActiveAssembleia ? (
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActivePriceMode('unico');
                  }}
                  className={`py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all ${
                    activePriceMode === 'unico'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  Preço Único
                </button>
                <button
                  type="button"
                  onClick={() => setActivePriceMode('diario')}
                  className={`py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all ${
                    activePriceMode === 'diario'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  Preços por Dia
                </button>
              </div>
            ) : null}

            {/* Pricing inputs */}
            <div className="space-y-3">
              {isActiveAssembleia || activePriceMode === 'unico' ? (
                /* Single Price View */
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-0.5 block">
                    {isActiveAssembleia ? `Preço da Inscrição (${activeEvent?.assemblyDay})` : 'Preço Único das Passagens (R$)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[11px] font-black text-slate-900 dark:text-white focus:border-indigo-500 transition-all font-mono"
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
                      ? 'Tarifa única da Assembleia. As inscrições para este evento cobrarão este valor padrão.'
                      : 'Este preço será replicado para todos os dias do congresso (Sexta, Sábado e Domingo) ao salvar.'
                    }
                  </p>
                </div>
              ) : (
                /* Custom Daily Prices View */
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Sexta */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-0.5 block">Sexta</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full pl-6 pr-1.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[11px] font-black text-slate-900 dark:text-white focus:border-indigo-500 transition-all"
                          value={dailyPrices['Sexta'] === 0 ? '' : dailyPrices['Sexta']}
                          onChange={(e) => setDailyPrices({ ...dailyPrices, 'Sexta': e.target.value === '' ? 0 : Number(e.target.value) })}
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    {/* Sábado */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-0.5 block">Sábado</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full pl-6 pr-1.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[11px] font-black text-slate-900 dark:text-white focus:border-indigo-500 transition-all font-mono"
                          value={dailyPrices['Sábado'] === 0 ? '' : dailyPrices['Sábado']}
                          onChange={(e) => setDailyPrices({ ...dailyPrices, 'Sábado': e.target.value === '' ? 0 : Number(e.target.value) })}
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    {/* Domingo */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-0.5 block">Domingo</label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full pl-6 pr-1.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[11px] font-black text-slate-900 dark:text-white focus:border-indigo-500 transition-all"
                          value={dailyPrices['Domingo'] === 0 ? '' : dailyPrices['Domingo']}
                          onChange={(e) => setDailyPrices({ ...dailyPrices, 'Domingo': e.target.value === '' ? 0 : Number(e.target.value) })}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Base/Fallback */}
                  <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-0.5 block">Preço Base de Vagas Individuais (Fallback)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pl-7 pr-1.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[11px] font-black text-slate-900 dark:text-white focus:border-indigo-500 transition-all"
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
        </div>

        {/* COL 2: Event Registration & Event List (Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Create New Event Toggle Panel */}
          <div className="transition-all duration-300">
            {!showCreateForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setNewEventName('');
                  setEventError(null);
                }}
                className="w-full py-5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-900/30 hover:border-indigo-400 dark:hover:border-blue-500 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-50 dark:bg-slate-800 dark:group-hover:bg-blue-950/40 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-blue-400 transition-colors">
                  <Plus size={16} />
                </div>
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Criar Evento com Tarifas</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">Configure um novo congresso/assembleia com tarifas próprias</span>
              </button>
            ) : (
              <div className="bg-white dark:bg-slate-900 border-2 border-indigo-100 dark:border-indigo-950/40 rounded-xl p-4 shadow-md space-y-3 relative animate-fadeIn">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X size={15} />
                </button>

                <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <span>📅</span> Novo Congresso ou Assembleia
                </h3>
                
                <div className="space-y-4">
                  {/* Nome do Evento */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-0.5">Nome do Evento</label>
                    <input
                      type="text"
                      placeholder="Ex: Assembleia de Circuito - Outubro 2026"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-lg outline-none text-[11px] font-bold text-slate-900 dark:text-white focus:border-indigo-500 transition-all font-sans"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                    />
                  </div>

                  {/* Segmented Control: Event Type Selector */}
                  <div className="space-y-1 font-sans">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-0.5 block">Tipo de Evento</label>
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setNewEventMode('congresso')}
                        className={`py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all ${
                          newEventMode === 'congresso'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-black'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        Congresso (3 Dias)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewEventMode('assembleia')}
                        className={`py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all ${
                          newEventMode === 'assembleia'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-black'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        Assembleia (1 Dia)
                      </button>
                    </div>
                  </div>

                  {/* Sub-form fields based on selected Event Type */}
                  {newEventMode === 'assembleia' ? (
                    /* ASSEMBLEIA FORM FIELDS */
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-3 border border-slate-150 dark:border-slate-850 space-y-3 font-sans">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Day of the Assembly */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-0.5 block">Dia da Realização</span>
                          <div className="grid grid-cols-3 gap-1 p-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-805">
                            {['Sexta', 'Sábado', 'Domingo'].map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setNewAssemblyDay(d)}
                                className={`py-1 text-[9px] font-extrabold uppercase rounded transition-colors ${
                                  newAssemblyDay === d
                                    ? 'bg-indigo-500 text-white shadow-sm font-black'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                }`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Flat Ticket Price */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-0.5 block">Preço da Passagem / Tarifa Única</span>
                          <div className="relative font-mono">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-bold outline-none text-slate-900 dark:text-white focus:border-indigo-500"
                              value={newEventPrice || ''}
                              onChange={(e) => setNewEventPrice(Number(e.target.value))}
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                        Apenas reservas com o dia selecionado ({newAssemblyDay}) estarão disponíveis para este evento com a tarifa única informada.
                      </p>
                    </div>
                  ) : (
                    /* CONGRESSO FORM FIELDS */
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-lg p-3 border border-slate-150 dark:border-slate-850 space-y-3 font-sans">
                      {/* Pricing Mode Toggle for Congress */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-0.5 block">Configuração do Preço</span>
                        <div className="grid grid-cols-2 gap-1 p-0.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setNewCongressPriceMode('unico')}
                            className={`py-1 text-[9px] font-bold uppercase rounded transition-all ${
                              newCongressPriceMode === 'unico'
                                ? 'bg-indigo-500 text-white shadow-sm font-black'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            Preço Único (Todos os dias)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewCongressPriceMode('diario')}
                            className={`py-1 text-[9px] font-bold uppercase rounded transition-all ${
                              newCongressPriceMode === 'diario'
                                ? 'bg-indigo-500 text-white shadow-sm font-black'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            Diferenciado por Dia
                          </button>
                        </div>
                      </div>

                      {newCongressPriceMode === 'unico' ? (
                        /* Flat Rate Congress input */
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-0.5 block">Preço Único do Congresso (R$)</span>
                          <div className="relative font-mono">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-bold outline-none text-slate-900 dark:text-white focus:border-indigo-500"
                              value={newEventPrice || ''}
                              onChange={(e) => setNewEventPrice(Number(e.target.value))}
                              placeholder="0,00"
                            />
                          </div>
                          <p className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                            O preço informado será replicado automaticamente para Sexta, Sábado e Domingo.
                          </p>
                        </div>
                      ) : (
                        /* Individual rates inputs */
                        <div className="space-y-2">
                          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                            Definir tarifas específicas deste novo evento (R$)
                          </span>
                          
                          <div className="grid grid-cols-4 gap-2 font-mono">
                            <div className="space-y-1 font-sans">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Base/Fallback</span>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[10px] font-bold outline-none text-slate-900 dark:text-white focus:border-indigo-500 font-mono"
                                value={newEventPrice || ''}
                                onChange={(e) => setNewEventPrice(Number(e.target.value))}
                                placeholder="0,00"
                              />
                            </div>
                            <div className="space-y-1 font-sans">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Sexta</span>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded text-[10px] font-bold outline-none text-slate-900 dark:text-white focus:border-indigo-500 font-mono"
                                value={newEventDailySexta || ''}
                                onChange={(e) => setNewEventDailySexta(Number(e.target.value))}
                                placeholder="0,00"
                              />
                            </div>
                            <div className="space-y-1 font-sans">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Sábado</span>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[10px] font-bold outline-none text-slate-900 dark:text-white focus:border-indigo-500 font-mono"
                                value={newEventDailySabado || ''}
                                onChange={(e) => setNewEventDailySabado(Number(e.target.value))}
                                placeholder="0,00"
                              />
                            </div>
                            <div className="space-y-1 font-sans">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Domingo</span>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-[10px] font-bold outline-none text-slate-900 dark:text-white focus:border-indigo-500 font-mono"
                                value={newEventDailyDomingo || ''}
                                onChange={(e) => setNewEventDailyDomingo(Number(e.target.value))}
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 font-sans">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase rounded"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newEventName.trim()) {
                          setEventError("Por favor, digite o nome do evento.");
                          return;
                        }
                        try {
                          const daily = {
                            'Sexta': 0,
                            'Sábado': 0,
                            'Domingo': 0
                          };

                          if (newEventMode === 'assembleia') {
                            daily[newAssemblyDay as 'Sexta' | 'Sábado' | 'Domingo'] = newEventPrice;
                          } else if (newCongressPriceMode === 'unico') {
                            daily['Sexta'] = newEventPrice;
                            daily['Sábado'] = newEventPrice;
                            daily['Domingo'] = newEventPrice;
                          } else {
                            daily['Sexta'] = newEventDailySexta;
                            daily['Sábado'] = newEventDailySabado;
                            daily['Domingo'] = newEventDailyDomingo;
                          }

                          await addEvent(
                            newEventName.trim(),
                            newEventPrice,
                            daily,
                            newEventMode,
                            newEventMode === 'assembleia' ? newAssemblyDay : undefined
                          );

                          setNewEventName('');
                          setEventError(null);
                          setShowCreateForm(false);
                        } catch (err: any) {
                          setEventError(err.message || "Erro ao criar evento.");
                        }
                      }}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider rounded"
                    >
                      Criar Evento com Tarifas
                    </button>
                  </div>

                  {eventError && (
                    <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider leading-relaxed">{eventError}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Historical List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Lista de Eventos Cadastrados</h3>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 font-mono">Total: {events.length}</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.map((evt) => {
                const isEditing = editingEventId === evt.id;
                const isDeleting = deletingEventId === evt.id;

                if (isEditing) {
                  return (
                    <div key={evt.id} className="p-3 bg-indigo-50/20 dark:bg-slate-800/20 border-l-4 border-indigo-500 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Editar Detalhes do Evento</span>
                        <button 
                          type="button" 
                          onClick={() => setEditingEventId(null)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Nome do Evento */}
                        <div>
                          <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Nome do Evento</label>
                          <input
                            type="text"
                            value={editEventName}
                            onChange={(e) => setEditEventName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 rounded font-medium text-slate-900 dark:text-white"
                            placeholder="Ex: Assembleia de Circuito"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Tipo do Evento */}
                          <div>
                            <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Tipo de Evento</label>
                            <select
                              value={editEventMode}
                              onChange={(e) => {
                                const mode = e.target.value as 'congresso' | 'assembleia';
                                setEditEventMode(mode);
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 rounded font-medium text-slate-800 dark:text-slate-200"
                            >
                              <option value="congresso">Congresso</option>
                              <option value="assembleia">Assembleia</option>
                            </select>
                          </div>

                          {/* Price mode or assembly day */}
                          {editEventMode === 'assembleia' ? (
                            <div>
                              <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Dia da Assembleia</label>
                              <select
                                value={editAssemblyDay}
                                onChange={(e) => setEditAssemblyDay(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 rounded font-medium text-slate-800 dark:text-slate-200"
                              >
                                <option value="Sábado">Sábado</option>
                                <option value="Domingo">Domingo</option>
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Estrutura de Preço</label>
                              <select
                                value={editCongressPriceMode}
                                onChange={(e) => setEditCongressPriceMode(e.target.value as 'unico' | 'diario')}
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 rounded font-medium text-slate-800 dark:text-slate-200"
                              >
                                <option value="unico">Tarifa Única (Todos os dias iguais)</option>
                                <option value="diario">Tarifas Individuais por Dia</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Pricing configurations */}
                        {editEventMode === 'assembleia' || editCongressPriceMode === 'unico' ? (
                          <div>
                            <label className="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">
                              {editEventMode === 'assembleia' ? 'Valor da Inscrição (R$)' : 'Valor Único de Passagem (R$)'}
                            </label>
                            <input
                              type="number"
                              value={editEventPrice || ''}
                              onChange={(e) => setEditEventPrice(parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 rounded font-mono font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200/60 dark:border-slate-800/60">
                            <div>
                              <label className="block text-[7px] font-black uppercase text-slate-400 tracking-wider mb-1">Sexta (R$)</label>
                              <input
                                type="number"
                                value={editEventDailySexta || ''}
                                onChange={(e) => setEditEventDailySexta(parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 rounded font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[7px] font-black uppercase text-slate-400 tracking-wider mb-1">Sábado (R$)</label>
                              <input
                                type="number"
                                value={editEventDailySabado || ''}
                                onChange={(e) => setEditEventDailySabado(parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 rounded font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[7px] font-black uppercase text-slate-400 tracking-wider mb-1">Domingo (R$)</label>
                              <input
                                type="number"
                                value={editEventDailyDomingo || ''}
                                onChange={(e) => setEditEventDailyDomingo(parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 rounded font-mono font-bold"
                              />
                            </div>
                          </div>
                        )}

                        {editEventError && (
                          <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider leading-relaxed">{editEventError}</p>
                        )}

                        {/* Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingEventId(null)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-800 dark:text-slate-300 font-black text-[9px] uppercase tracking-wider rounded transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                if (!editEventName.trim()) {
                                  setEditEventError("Insira um nome válido para o evento.");
                                  return;
                                }

                                let daily: { [day: string]: number } = {};
                                if (editEventMode === 'assembleia') {
                                  daily[editAssemblyDay] = editEventPrice;
                                } else {
                                  if (editCongressPriceMode === 'unico') {
                                    daily = {
                                      'Sexta': editEventPrice,
                                      'Sábado': editEventPrice,
                                      'Domingo': editEventPrice
                                    };
                                  } else {
                                    daily = {
                                      'Sexta': editEventDailySexta,
                                      'Sábado': editEventDailySabado,
                                      'Domingo': editEventDailyDomingo
                                    };
                                  }
                                }

                                await updateEvent(
                                  evt.id,
                                  editEventName.trim(),
                                  editEventMode === 'assembleia' || editCongressPriceMode === 'unico' ? editEventPrice : 0,
                                  daily,
                                  editEventMode,
                                  editEventMode === 'assembleia' ? editAssemblyDay : undefined
                                );

                                setEditingEventId(null);
                                setEditEventError(null);
                              } catch (err: any) {
                                setEditEventError(err.message || "Erro ao salvar alterações.");
                              }
                            }}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-wider rounded transition-all shadow-sm"
                          >
                            Salvar Alterações
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isDeleting) {
                  return (
                    <div key={evt.id} className="p-3 bg-rose-50/50 dark:bg-rose-950/10 border-l-4 border-rose-500 space-y-2">
                      <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                        Deseja realmente remover "{evt.name}"?
                      </p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        As reservas vinculadas a este evento NÃO serão perdidas do banco de dados, mas ele deixará de aparecer neste painel e em seletores globais. This can't be undone easily.
                      </p>
                      <div className="flex items-center gap-2 pt-1 justify-end">
                        <button
                          type="button"
                          onClick={() => setDeletingEventId(null)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold uppercase tracking-wider rounded"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteEvent(evt.id);
                              setDeletingEventId(null);
                            } catch (err: any) {
                              alert(err.message || "Erro ao excluir evento.");
                            }
                          }}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase tracking-wider rounded shadow-sm"
                        >
                          Confirmar Exclusão
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={evt.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/45 dark:hover:bg-slate-900/10 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {evt.id === activeEventId && (
                          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded-sm">
                            Novas Vendas Ativas
                          </span>
                        )}
                        <span className="font-bold text-[11px] text-slate-900 dark:text-white leading-tight">{evt.name}</span>
                      </div>
                      {/* display fares instantly for each event */}
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                        Tarifas: <span className="font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded ml-0.5 text-[9px] font-bold">
                          {evt.eventType === 'assembleia' ? (
                            `Assembleia (Inscrição Única - ${evt.assemblyDay || 'Sábado'}): R$ ${evt.ticketPrice || evt.dailyPrices?.[evt.assemblyDay || 'Sábado'] || 0}`
                          ) : (
                            `Sexta: R$ ${evt.dailyPrices?.['Sexta'] ?? 0} | Sáb: R$ ${evt.dailyPrices?.['Sábado'] ?? 0} | Dom: R$ ${evt.dailyPrices?.['Domingo'] ?? 0}`
                          )}
                        </span>
                      </p>
                      <p className="text-[8px] text-slate-400 font-medium uppercase tracking-wider pt-0.5">Criado em: {new Date(evt.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1.5 sm:pt-0">
                      {evt.id !== activeEventId && (
                        <button
                          type="button"
                          onClick={() => setActiveEvent(evt.id)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:text-emerald-400 text-slate-700 dark:text-slate-300 text-[9px] font-bold rounded transition-all animate-none"
                        >
                          Ativar
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingEventId(evt.id);
                          setEditEventName(evt.name);
                          setEditEventMode(evt.eventType || 'congresso');
                          setEditAssemblyDay(evt.assemblyDay || 'Sábado');
                          
                          if (evt.eventType === 'assembleia') {
                            setEditEventPrice(evt.ticketPrice || evt.dailyPrices?.[evt.assemblyDay || 'Sábado'] || 0);
                          } else {
                            const daily = evt.dailyPrices || {};
                            const px = evt.ticketPrice || daily['Sexta'] || 0;
                            const allEqual = daily['Sexta'] === daily['Sábado'] && daily['Sábado'] === daily['Domingo'];
                            
                            if (allEqual) {
                              setEditCongressPriceMode('unico');
                              setEditEventPrice(px);
                            } else {
                              setEditCongressPriceMode('diario');
                              setEditEventDailySexta(daily['Sexta'] || 0);
                              setEditEventDailySabado(daily['Sábado'] || 0);
                              setEditEventDailyDomingo(daily['Domingo'] || 0);
                            }
                          }
                          setEditEventError(null);
                        }}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:text-indigo-400 text-slate-700 dark:text-slate-300 text-[9px] font-bold rounded transition-all"
                      >
                        Editar
                      </button>
                      
                      {evt.id !== activeEventId && (
                        <button
                          type="button"
                          onClick={() => setDeletingEventId(evt.id)}
                          className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[9px] font-bold rounded transition-all"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
