import React, { useState } from 'react';
import { Calendar, Plus, X, Trash2 } from 'lucide-react';
import { useEvent } from '../../contexts/EventContext';

export const EventsConfigSection: React.FC = () => {
  const { 
    events, 
    activeEventId, 
    addEvent, 
    updateEvent, 
    setActiveEvent, 
    deleteEvent 
  } = useEvent();

  // New Event Form States
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
  const [success, setSuccess] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fadeIn">
      {/* Event List - Span 7 */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">Lista de Eventos Cadastrados</h2>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold leading-none mt-0.5">
                Selecione qual evento receberá novas reservas e configure tarifas
              </p>
            </div>
            <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
              Total: {events.length}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {events.length === 0 ? (
              <div className="p-8 text-center text-slate-450 dark:text-slate-500 text-[11px] font-medium uppercase tracking-wider">
                Nenhum evento cadastrado no sistema.
              </div>
            ) : (
              events.map((evt) => {
                const isEditing = editingEventId === evt.id;
                const isDeleting = deletingEventId === evt.id;

                if (isEditing) {
                  return (
                    <div key={evt.id} className="p-4 bg-amber-500/5 dark:bg-slate-800/10 border-l-4 border-amber-600 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Editar Detalhes do Evento</span>
                        <button 
                          type="button" 
                          onClick={() => setEditingEventId(null)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Nome do Evento */}
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase text-slate-400 tracking-wider">Nome do Evento</label>
                          <input
                            type="text"
                            value={editEventName}
                            onChange={(e) => setEditEventName(e.target.value)}
                            className="w-full px-3 py-1.5 text-[11px] bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 outline-none focus:border-amber-500 rounded-lg font-bold text-slate-900 dark:text-white"
                            placeholder="Ex: Assembleia de Circuito"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Tipo do Evento */}
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold uppercase text-slate-400 tracking-wider">Tipo de Evento</label>
                            <select
                              value={editEventMode}
                              onChange={(e) => {
                                const mode = e.target.value as 'congresso' | 'assembleia';
                                setEditEventMode(mode);
                              }}
                              className="w-full px-3 py-1.5 text-[11px] bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 outline-none focus:border-amber-500 rounded-lg font-bold text-slate-800 dark:text-slate-200"
                            >
                              <option value="congresso">Congresso</option>
                              <option value="assembleia">Assembleia</option>
                            </select>
                          </div>

                          {/* Price mode or assembly day */}
                          {editEventMode === 'assembleia' ? (
                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold uppercase text-slate-400 tracking-wider">Dia da Assembleia</label>
                              <select
                                value={editAssemblyDay}
                                onChange={(e) => setEditAssemblyDay(e.target.value)}
                                className="w-full px-3 py-1.5 text-[11px] bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 outline-none focus:border-amber-500 rounded-lg font-bold text-slate-800 dark:text-slate-200"
                              >
                                <option value="Sexta">Sexta</option>
                                <option value="Sábado">Sábado</option>
                                <option value="Domingo">Domingo</option>
                              </select>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="block text-[9px] font-bold uppercase text-slate-400 tracking-wider">Estrutura de Preço</label>
                              <select
                                value={editCongressPriceMode}
                                onChange={(e) => setEditCongressPriceMode(e.target.value as 'unico' | 'diario')}
                                className="w-full px-3 py-1.5 text-[11px] bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 outline-none focus:border-amber-500 rounded-lg font-bold text-slate-800 dark:text-slate-200"
                              >
                                <option value="unico">Tarifa Única (Todos os dias iguais)</option>
                                <option value="diario">Tarifas Individuais por Dia</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Pricing configurations */}
                        {editEventMode === 'assembleia' || editCongressPriceMode === 'unico' ? (
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                              {editEventMode === 'assembleia' ? 'Valor da Inscrição (R$)' : 'Valor Único de Passagem (R$)'}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={editEventPrice || ''}
                                onChange={(e) => setEditEventPrice(parseFloat(e.target.value) || 0)}
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 outline-none focus:border-amber-500 rounded-lg font-mono font-bold text-slate-900 dark:text-white"
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Valores por Dia (R$)</span>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold uppercase text-slate-400 tracking-wider">Sexta</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editEventDailySexta || ''}
                                  onChange={(e) => setEditEventDailySexta(parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-amber-500 rounded font-mono font-bold text-slate-900 dark:text-white"
                                  placeholder="0,00"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold uppercase text-slate-400 tracking-wider">Sábado</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editEventDailySabado || ''}
                                  onChange={(e) => setEditEventDailySabado(parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-amber-500 rounded font-mono font-bold text-slate-900 dark:text-white"
                                  placeholder="0,00"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold uppercase text-slate-400 tracking-wider">Domingo</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editEventDailyDomingo || ''}
                                  onChange={(e) => setEditEventDailyDomingo(parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:border-amber-500 rounded font-mono font-bold text-slate-900 dark:text-white"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {editEventError && (
                          <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider leading-relaxed">{editEventError}</p>
                        )}

                        {/* Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                          <button
                            type="button"
                            onClick={() => setEditingEventId(null)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 font-black text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
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
                            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all shadow-sm cursor-pointer"
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
                    <div key={evt.id} className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border-l-4 border-rose-500 space-y-2">
                      <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                        Deseja realmente remover "{evt.name}"?
                      </p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        As reservas vinculadas a este evento NÃO serão perdidas do banco de dados, mas ele deixará de aparecer neste painel e em seletores globais. Essa ação não pode ser desfeita facilmente.
                      </p>
                      <div className="flex items-center gap-2 pt-1 justify-end">
                        <button
                          type="button"
                          onClick={() => setDeletingEventId(null)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[9px] font-bold uppercase tracking-wider rounded-lg cursor-pointer"
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
                          className="px-4 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm cursor-pointer"
                        >
                          Confirmar Exclusão
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={evt.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/45 dark:hover:bg-slate-900/10 transition-colors">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {evt.id === activeEventId && (
                          <span className="bg-emerald-100 text-emerald-850 dark:bg-emerald-950 dark:text-emerald-300 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded">
                            Novas Vendas Ativas
                          </span>
                        )}
                        <span className="font-extrabold text-[12px] text-slate-900 dark:text-white leading-tight">{evt.name}</span>
                      </div>
                      
                      <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed flex items-center gap-1.5 flex-wrap">
                        <span className="uppercase tracking-wider text-[8px] px-1 bg-slate-100 dark:bg-slate-800 rounded font-black text-slate-500 dark:text-slate-400">
                          {evt.eventType === 'assembleia' ? 'Assembleia' : 'Congresso'}
                        </span>
                        <span>Tarifas:</span>
                        <span className="font-mono text-slate-650 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                          {evt.eventType === 'assembleia' ? (
                            `Inscrição Única - ${evt.assemblyDay || 'Sábado'}: R$ ${evt.ticketPrice || evt.dailyPrices?.[evt.assemblyDay || 'Sábado'] || 0}`
                          ) : (
                            `Sexta: R$ ${evt.dailyPrices?.['Sexta'] ?? 0} | Sáb: R$ ${evt.dailyPrices?.['Sábado'] ?? 0} | Dom: R$ ${evt.dailyPrices?.['Domingo'] ?? 0}`
                          )}
                        </span>
                      </p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider pt-0.5">Criado em: {new Date(evt.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1.5 sm:pt-0 shrink-0">
                      {evt.id !== activeEventId && (
                        <button
                          type="button"
                          onClick={() => setActiveEvent(evt.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:text-emerald-400 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer"
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
                        className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/20 hover:text-amber-700 dark:text-amber-400 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer"
                      >
                        Editar
                      </button>
                      
                      {evt.id !== activeEventId && (
                        <button
                          type="button"
                          onClick={() => setDeletingEventId(evt.id)}
                          className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-955/40 text-rose-650 dark:text-rose-400 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create Event Form - Span 5 */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-850">
            <h2 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider">Criar Novo Evento</h2>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold leading-none mt-0.5">
              Insira as tarifas e configure as passagens para um novo evento
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Nome do Evento */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-505 uppercase tracking-widest ml-0.5 block">Nome do Evento</label>
              <input
                type="text"
                placeholder="Ex: Assembleia de Circuito - Outubro 2026"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 rounded-lg outline-none text-[11px] font-bold text-slate-900 dark:text-white focus:border-amber-500 transition-all font-sans placeholder:font-medium placeholder:text-slate-450"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
              />
            </div>

            {/* Segmented Control: Event Type Selector */}
            <div className="space-y-1 font-sans">
              <label className="text-[9px] font-bold text-slate-505 uppercase tracking-widest ml-0.5 block">Tipo de Evento</label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-50 dark:bg-slate-955 rounded-lg border border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setNewEventMode('congresso')}
                  className={`py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
                    newEventMode === 'congresso'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-black'
                      : 'text-slate-400 hover:text-slate-655 dark:hover:text-slate-350'
                  }`}
                >
                  Congresso (3 Dias)
                </button>
                <button
                  type="button"
                  onClick={() => setNewEventMode('assembleia')}
                  className={`py-1 text-[9px] font-black uppercase tracking-wider rounded transition-all cursor-pointer ${
                    newEventMode === 'assembleia'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-black'
                      : 'text-slate-400 hover:text-slate-655 dark:hover:text-slate-350'
                  }`}
                >
                  Assembleia (1 Dia)
                </button>
              </div>
            </div>

            {/* Sub-form fields based on selected Event Type */}
            {newEventMode === 'assembleia' ? (
              /* ASSEMBLEIA FORM FIELDS */
              <div className="bg-slate-50 dark:bg-slate-950/45 rounded-xl p-3 border border-slate-150 dark:border-slate-850 space-y-3 font-sans">
                <div className="space-y-3">
                  {/* Day of the Assembly */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-505 uppercase tracking-widest ml-0.5 block">Dia da Realização</span>
                    <div className="grid grid-cols-3 gap-1 p-0.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-805">
                      {['Sexta', 'Sábado', 'Domingo'].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setNewAssemblyDay(d)}
                          className={`py-1 text-[9px] font-extrabold uppercase rounded transition-colors cursor-pointer ${
                            newAssemblyDay === d
                              ? 'bg-amber-600 text-white shadow-sm font-black'
                              : 'text-slate-405 hover:text-slate-650 dark:hover:text-slate-300'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Flat Ticket Price */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-505 uppercase tracking-widest ml-0.5 block">Preço da Passagem / Tarifa Única</span>
                    <div className="relative font-mono">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-bold outline-none text-slate-900 dark:text-white focus:border-amber-500"
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
              <div className="bg-slate-50 dark:bg-slate-950/45 rounded-xl p-3 border border-slate-150 dark:border-slate-850 space-y-3 font-sans">
                {/* Pricing Mode Toggle for Congress */}
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-550 uppercase tracking-widest ml-0.5 block">Configuração do Preço</span>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setNewCongressPriceMode('unico')}
                      className={`py-1 text-[9px] font-bold uppercase rounded transition-all cursor-pointer ${
                        newCongressPriceMode === 'unico'
                          ? 'bg-amber-600 text-white shadow-sm font-black'
                          : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-400'
                      }`}
                    >
                      Preço Único (Todos os dias)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCongressPriceMode('diario')}
                      className={`py-1 text-[9px] font-bold uppercase rounded transition-all cursor-pointer ${
                        newCongressPriceMode === 'diario'
                          ? 'bg-amber-600 text-white shadow-sm font-black'
                          : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-400'
                      }`}
                    >
                      Diferenciado por Dia
                    </button>
                  </div>
                </div>

                {newCongressPriceMode === 'unico' ? (
                  /* Flat Rate Congress input */
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-505 uppercase tracking-widest ml-0.5 block">Preço Único do Congresso (R$)</span>
                    <div className="relative font-mono">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pl-7 pr-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-bold outline-none text-slate-900 dark:text-white focus:border-amber-500"
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
                      Definir tarifas específicas do evento (R$)
                    </span>
                    
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div className="space-y-1 font-sans">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Sexta</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-lg text-[10px] font-bold outline-none text-slate-900 dark:text-white focus:border-amber-500 font-mono"
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
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-lg text-[10px] font-bold outline-none text-slate-900 dark:text-white focus:border-amber-500 font-mono"
                          value={newEventDailySabado || ''}
                          onChange={(e) => setNewEventDailySabado(Number(e.target.value))}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-1 font-sans col-span-2">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block">Domingo</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-lg text-[10px] font-bold outline-none text-slate-900 dark:text-white focus:border-amber-500 font-mono"
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

            {eventError && (
              <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider leading-relaxed">{eventError}</p>
            )}
          </div>

          {/* Actions Footer */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
            <div>
              {success && (
                <span className="text-[9px] font-black text-emerald-650 dark:text-emerald-450 uppercase tracking-widest animate-pulse">✓ Salvo!</span>
              )}
            </div>
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
                  setSuccess(true);
                  setTimeout(() => setSuccess(false), 3000);
                } catch (err: any) {
                  setEventError(err.message || "Erro ao criar evento.");
                }
              }}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all shadow-sm active:scale-[0.98] flex items-center gap-1 cursor-pointer font-sans"
            >
              <Plus size={12} />
              <span>Cadastrar Evento</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
