import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';
import { Bus as BusIcon, Calendar, Users, Printer, MapPin, Phone, CheckCircle2, Circle } from 'lucide-react';
import { db } from '../services/firebase';
import { Reservation, Bus, Congregation } from '../types';
import { cn } from '../lib/utils';

export default function ManifestView() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [selectedBus, setSelectedBus] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('Sexta');

  const days = ['Sexta', 'Sábado', 'Domingo'];

  useEffect(() => {
    const unsubB = onSnapshot(collection(db, 'buses'), snap => 
      setBuses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus)))
    );
    const unsubC = onSnapshot(collection(db, 'congregations'), snap => 
      setCongregations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Congregation)))
    );
    const unsubR = onSnapshot(collection(db, 'reservations'), snap => 
      setReservations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)))
    );
    return () => { unsubB(); unsubC(); unsubR(); };
  }, []);

  const busInfo = buses.find(b => b.id === selectedBus);
  
  const manifestPassengers = reservations
    .filter(res => res.busId === selectedBus && res.days.includes(selectedDay))
    .flatMap(res => res.passengers.map((p, pIdx) => ({
      ...p,
      reservationId: res.id,
      passengerIndex: pIdx,
      isBoarded: res.boardedStatus?.[selectedDay]?.includes(pIdx) || false,
      congregation: congregations.find(c => c.id === res.congregationId)?.name || 'N/A'
    })))
    .sort((a, b) => a.name.localeCompare(b.name));

  const toggleBoarding = async (reservationId: string, passengerIndex: number, currentStatus: boolean) => {
    const res = reservations.find(r => r.id === reservationId);
    if (!res) return;

    const currentBoarded = res.boardedStatus?.[selectedDay] || [];
    const newBoarded = currentStatus 
      ? currentBoarded.filter(idx => idx !== passengerIndex)
      : [...currentBoarded, passengerIndex];

    try {
      await updateDoc(doc(db, 'reservations', reservationId), {
        [`boardedStatus.${selectedDay}`]: newBoarded
      });
    } catch (err) {
      console.error("Error updating boarding status:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-semibold text-[#1b1b1b] tracking-tight mb-1">Lista de Embarque</h1>
          <p className="text-sm text-[#707070]">Controle de passageiros e confirmação de presença</p>
        </div>
        <button 
          onClick={handlePrint}
          disabled={!selectedBus}
          className="ms-button-primary flex items-center gap-2 shadow-sm"
        >
          <Printer size={16} />
          Imprimir Lista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-[#f2f2f2] print:hidden">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#707070]">Selecionar Ônibus</label>
          <select 
            className="w-full p-2.5 bg-white border border-[#e5e5e5] rounded-sm text-sm outline-none focus:border-[#0067b8]"
            value={selectedBus}
            onChange={e => setSelectedBus(e.target.value)}
          >
            <option value="">Escolha um Ônibus</option>
            {buses.map(b => (
              <option key={b.id} value={b.id}>{b.name} - {b.number}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#707070]">Escolher Dia</label>
          <div className="flex gap-1.5 font-semibold">
            {days.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex-1 py-2 px-4 rounded-sm text-xs transition-all border",
                  selectedDay === day 
                    ? "bg-[#0067b8] border-[#0067b8] text-white" 
                    : "bg-white border-[#e5e5e5] text-[#707070] hover:bg-[#f3f3f3]"
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedBus ? (
        <div className="overflow-hidden print:border-0 print:shadow-none">
          <div className="py-8 border-b border-[#f2f2f2]">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-sm flex items-center justify-center text-white">
                    <BusIcon size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#1b1b1b] leading-tight">{busInfo?.name}</h2>
                    <p className="text-xs font-semibold text-[#707070] uppercase">Prefixo: {busInfo?.number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-2 text-[#707070]">
                    <Users size={14} />
                    <span className="text-xs font-semibold">{manifestPassengers.length} / {busInfo?.capacity} Vagas</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#707070]">
                    <Calendar size={14} />
                    <span className="text-xs font-semibold uppercase">{selectedDay}</span>
                  </div>
                </div>
              </div>

              <div className="ms-card px-6 py-4 rounded-sm print:hidden self-start bg-[#fafafa]">
                <div className="flex items-center gap-2 text-xs text-[#707070] mb-2">
                  <Phone size={12} />
                  <span className="font-medium">Motorista: {busInfo?.driver || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#707070]">
                  <MapPin size={12} />
                  <span className="font-medium">Placa: {busInfo?.plate || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="py-6 overflow-x-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
              <thead>
                <tr className="border-b border-[#f2f2f2] bg-[#fafafa]">
                  <th className="px-6 py-4 text-xs font-semibold text-[#707070] w-16">#</th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#707070] text-center print:hidden w-16">Ticket</th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#707070]">Passageiro</th>
                  <th className="px-4 py-4 text-xs font-semibold text-[#707070] text-center">Documento</th>
                  <th className="px-6 py-4 text-xs font-semibold text-[#707070] text-right">Congregação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f2f2]">
                {manifestPassengers.map((p, idx) => (
                  <tr key={`${p.reservationId}-${p.passengerIndex}`} className="hover:bg-[#fcfcfc] transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-[#707070]">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-4 text-center print:hidden">
                      <button 
                        onClick={() => toggleBoarding(p.reservationId, p.passengerIndex, p.isBoarded)}
                        className={cn(
                          "w-8 h-8 rounded-sm flex items-center justify-center transition-all",
                          p.isBoarded 
                            ? "bg-emerald-500 text-white shadow-sm" 
                            : "bg-[#f2f2f2] text-slate-300 hover:text-[#707070]"
                        )}
                      >
                        {p.isBoarded ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#1b1b1b]">
                      {p.name}
                    </td>
                    <td className="px-4 py-4 text-[11px] font-medium text-[#707070] text-center uppercase tracking-wide">
                      {p.document}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-[#707070] text-right">
                      {p.congregation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>


            {manifestPassengers.length === 0 && (
              <div className="py-20 text-center">
                <Users size={48} className="mx-auto text-slate-100 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum passageiro neste dia</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-32 text-center">
          <BusIcon size={48} className="mx-auto text-slate-200 mb-6" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Selecione um veículo para ver os passageiros</p>
        </div>
      )}
    </div>
  );
}
