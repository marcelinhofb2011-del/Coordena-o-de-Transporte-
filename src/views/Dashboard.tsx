import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, where, orderBy } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  Users, 
  Bus as BusIcon, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  PieChart as PieIcon
} from 'lucide-react';
import { db } from '../services/firebase';
import { Bus, Reservation, PaymentStatus, UserRole } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

const Dashboard: React.FC = () => {
  const { appUser } = useAuth();
  const { theme } = useTheme();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [congregations, setCongregations] = useState<any[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!appUser) return;

    let resQuery = query(collection(db, 'reservations'));
    
    // Apply server-side filters to match security rules
    if ((appUser.role === UserRole.COORDINATOR || appUser.role === UserRole.USER || appUser.role === UserRole.ASSISTANT) && appUser.congregationId) {
      resQuery = query(resQuery, where('congregationId', '==', appUser.congregationId));
    }

    const unsubRes = onSnapshot(resQuery, (snap) => {
      setReservations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));
      setLoading(false);
    });

    const unsubBuses = onSnapshot(collection(db, 'buses'), (snap) => {
      setBuses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus)));
    });

    const unsubCongs = onSnapshot(collection(db, 'congregations'), (snap) => {
      setCongregations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubRes();
      unsubBuses();
      unsubCongs();
    };
  }, [appUser]);

  useEffect(() => {
    if (buses.length > 0 && !selectedBusId) {
      setSelectedBusId(buses[0].id);
    }
  }, [buses, selectedBusId]);

  // Calculate Stats
  const totalReservations = reservations.length;
  const totalPassengers = reservations.reduce((acc, r) => acc + (r.passengers?.length || 0), 0);
  const totalGross = reservations.reduce((acc, r) => acc + r.totalValue, 0);
  const totalCollected = reservations.reduce((acc, current) => acc + current.amountPaid, 0);
  const totalPending = reservations.reduce((acc, current) => acc + (current.balance > 0 ? current.balance : 0), 0);
  const paidCount = reservations.filter(r => r.paymentStatus === PaymentStatus.PAGO).length;
  const partialCount = reservations.filter(r => r.paymentStatus === PaymentStatus.PARCIAL).length;
  const pendingCount = reservations.filter(r => r.paymentStatus === PaymentStatus.PENDENTE).length;

  const totalSeats = buses.reduce((acc, bus) => acc + bus.capacity, 0);
  const occupiedSeats = totalPassengers;
  const availableSeats = totalSeats - occupiedSeats;
  const occupationPercent = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0;

  const fullBuses = buses.filter(bus => {
    const busPassengers = reservations
      .filter(r => r.busId === bus.id)
      .reduce((acc, r) => acc + (r.passengers?.length || 0), 0);
    return busPassengers >= bus.capacity;
  }).length;

  const stats = [
    { label: 'Passageiros', value: totalPassengers, icon: Users, color: 'text-indigo-600', bg: 'bg-white border border-slate-200' },
    { label: 'Vendas Totais', value: formatCurrency(totalGross), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-white border border-slate-200' },
    { label: 'Pendentes', value: pendingCount + partialCount, icon: Clock, color: 'text-orange-600', bg: 'bg-white border border-slate-200' },
  ];

  // Get occupied passenger slots for the selected bus
  const getOccupancyList = (busId: string) => {
    if (!busId) return [];
    const busReservations = reservations.filter(r => r.busId === busId);
    
    // Sort reservations to maintain a stable, predictable assignment of passenger to seat number
    const sortedReservations = [...busReservations].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return dateA - dateB;
    });

    const list: Array<{
      passengerName: string;
      document: string;
      paymentStatus: PaymentStatus;
      reservationId: string;
      congregationName: string;
      notes: string;
      createdBy: string;
    }> = [];

    sortedReservations.forEach(res => {
      const congName = congregations.find(c => c.id === res.congregationId)?.name || 'Geral/Outra';
      res.passengers?.forEach(p => {
        list.push({
          passengerName: p.name,
          document: p.document || 'Não informado',
          paymentStatus: res.paymentStatus,
          reservationId: res.id,
          congregationName: congName,
          notes: res.notes || 'Nenhuma',
          createdBy: res.createdBy || 'Sistema'
        });
      });
    });

    return list;
  };

  const pieData = [
    { name: 'Pagos', value: paidCount, color: '#10b981' },
    { name: 'Parciais', value: partialCount, color: '#f59e0b' },
    { name: 'Pendentes', value: pendingCount, color: '#ef4444' }
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-[#1b1b1b] dark:text-white tracking-tight mb-1">Visão Geral</h1>
          <p className="text-sm text-[#707070] dark:text-slate-400">Insights em tempo real da operação logística</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-[#707070] bg-white dark:bg-slate-900 px-4 py-2 border border-[#e5e5e5] dark:border-slate-800 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-900/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] uppercase tracking-tighter">Live</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-[#0067b8] dark:text-blue-400" />
            <span className="dark:text-slate-300">{currentTime.toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            key={stat.label}
            className="ms-card p-6"
          >
            <p className="text-[10px] font-semibold text-[#707070] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <stat.icon size={12} className={stat.color} />
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-[#1b1b1b] dark:text-white">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <div className="lg:col-span-2 ms-card p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#f2f2f2] dark:bg-slate-800 flex items-center justify-center text-[#1b1b1b] dark:text-white rounded-sm transition-colors">
                <BusIcon size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1b1b1b] dark:text-white">Mapa de Ocupação da Frota</h2>
                <p className="text-[11px] text-[#707070] dark:text-slate-400">Layout interativo das poltronas do veículo</p>
              </div>
            </div>
            {buses.length > 0 && (
              <div className="w-full sm:w-48">
                <select
                  value={selectedBusId}
                  onChange={(e) => {
                    setSelectedBusId(e.target.value);
                    setSelectedSeat(null);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-sm text-xs font-bold focus:outline-none focus:border-[#0067b8]"
                >
                  {buses.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {buses.length === 0 ? (
            <div className="text-center py-12 text-[#707070] dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-sm">
              <BusIcon size={44} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold">Nenhum ônibus na frota</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Cadastre ônibus para visualizar os assentos.</p>
            </div>
          ) : (
            (() => {
              const currentBus = buses.find(b => b.id === selectedBusId) || buses[0];
              const occupancyList = getOccupancyList(currentBus.id);
              const capacity = currentBus.capacity || 40;
              const numRows = Math.ceil(capacity / 4);
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left Column: Vertical Bus Blueprint Layout */}
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-[270px] bg-slate-50/50 dark:bg-slate-900/40 border-4 border-slate-300/85 dark:border-slate-800 rounded-t-[36px] rounded-b-[16px] p-4 shadow-inner relative">
                      {/* Top Cabin / Windshield Design */}
                      <div className="border-b-2 border-dashed border-slate-300/70 dark:border-slate-800 pb-3 mb-4">
                        <div className="h-6 bg-slate-800 dark:bg-slate-950 rounded-t-2xl mb-3 border-b border-slate-600 flex items-center justify-center">
                          <div className="w-12 h-1 bg-slate-500 rounded-full opacity-40" />
                        </div>
                        <div className="flex items-center justify-between px-2 text-slate-400 dark:text-slate-500">
                          {/* Driver Seat Representation */}
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full border-2 border-slate-400/80 dark:border-slate-700 flex items-center justify-center bg-slate-100 dark:bg-slate-850">
                              <span className="w-2.5 h-2.5 rounded-full border border-slate-500 bg-slate-450 dark:bg-slate-600" />
                            </div>
                            <span className="text-[8px] font-bold uppercase mt-1 tracking-wider opacity-60">Motorista</span>
                          </div>
                          
                          {/* Front Entrance / Step Door Representation */}
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-7 border border-slate-300 dark:border-slate-750 bg-slate-100 dark:bg-slate-850 flex flex-col justify-between p-1 rounded-sm">
                              <div className="h-0.5 bg-slate-355 dark:bg-slate-600 rounded-full" />
                              <div className="h-0.5 bg-slate-355 dark:bg-slate-600 rounded-full" />
                              <div className="h-0.5 bg-slate-355 dark:bg-slate-600 rounded-full" />
                            </div>
                            <span className="text-[8px] font-bold uppercase mt-1 tracking-wider opacity-60">Entrada</span>
                          </div>
                        </div>
                      </div>

                      {/* Seat Map Grid Scroller */}
                      <div className="max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300">
                        <div className="grid grid-cols-5 gap-y-2.5 gap-x-1.5 justify-items-center">
                          {Array.from({ length: numRows }).map((_, r) => {
                            // Column assignments: left window, left aisle, row label, right aisle, right window
                            const seatsInRow = [
                              { index: r * 4 + 0, side: 'L' },
                              { index: r * 4 + 1, side: 'L' },
                              { isAisle: true, rowNum: r + 1 },
                              { index: r * 4 + 2, side: 'R' },
                              { index: r * 4 + 3, side: 'R' }
                            ];

                            return seatsInRow.map((col, cIndex) => {
                              if (col.isAisle) {
                                return (
                                  <div key={`aisle-${r}`} className="flex items-center justify-center text-[9px] font-extrabold text-slate-400 dark:text-slate-600 h-9 select-none">
                                    {col.rowNum}
                                  </div>
                                );
                              }

                              const seatIdx = col.index!;
                              if (seatIdx >= capacity) {
                                return <div key={`empty-${seatIdx}`} className="w-9 h-9" />;
                              }

                              const isOccupied = seatIdx < occupancyList.length;
                              const seatData = isOccupied ? occupancyList[seatIdx] : null;
                              const seatNum = seatIdx + 1;

                              // Style selection
                              let seatStyle = "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-750 text-slate-500 border-slate-200 dark:border-slate-800";
                              if (isOccupied && seatData) {
                                if (seatData.paymentStatus === PaymentStatus.PAGO) {
                                  seatStyle = "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/10 hover:bg-emerald-600";
                                } else if (seatData.paymentStatus === PaymentStatus.PARCIAL) {
                                  seatStyle = "bg-amber-500 text-white border-amber-600 shadow-amber-500/10 hover:bg-amber-600";
                                } else {
                                  seatStyle = "bg-rose-500 text-white border-rose-600 shadow-rose-500/10 hover:bg-rose-600";
                                }
                              }

                              const isCurrentSelection = selectedSeat && selectedSeat.seatNumber === seatNum;

                              return (
                                <button
                                  key={`seat-${seatNum}`}
                                  type="button"
                                  onClick={() => setSelectedSeat({
                                    seatNumber: seatNum,
                                    isOccupied,
                                    ...seatData
                                  })}
                                  className={cn(
                                    "relative w-9 h-9 rounded-t-lg rounded-b-sm flex flex-col items-center justify-center text-[10px] font-black tracking-tight transition-all duration-150 border-b-2 shadow-xs cursor-pointer select-none",
                                    seatStyle,
                                    isCurrentSelection ? "ring-2 ring-[#0067b8] dark:ring-blue-400 ring-offset-1 dark:ring-offset-slate-900 scale-102" : ""
                                  )}
                                >
                                  {/* Headrest padding visual */}
                                  <div className="absolute top-0.5 w-[75%] h-1 rounded-full bg-black/10 dark:bg-white/10" />
                                  <span className="mt-1">{seatNum}</span>
                                </button>
                              );
                            });
                          })}
                        </div>
                      </div>
                      
                      {/* Back bathroom indicator */}
                      <div className="mt-4 border-t border-slate-200/50 dark:border-slate-850 pt-2 flex justify-between px-3 text-[10px] font-black text-slate-400/80 dark:text-slate-600">
                        <span>FUNDO</span>
                        <span>BANHEIRO 🚽</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Legend, selected seat details, and mini statistics */}
                  <div className="space-y-4">
                    {/* Color legends */}
                    <div className="bg-slate-50 dark:bg-slate-900/30 p-4 border border-[#f2f2f2] dark:border-slate-850/50 rounded-sm">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Legenda de Assentos</h4>
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] font-bold text-[#1b1b1b] dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-t-md bg-emerald-500 border border-emerald-600" />
                          <span>Pago ({occupancyList.filter(o => o.paymentStatus === PaymentStatus.PAGO).length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-t-md bg-amber-500 border border-amber-600" />
                          <span>Parcial ({occupancyList.filter(o => o.paymentStatus === PaymentStatus.PARCIAL).length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-t-md bg-rose-500 border border-rose-600" />
                          <span>Pendente ({occupancyList.filter(o => o.paymentStatus === PaymentStatus.PENDENTE).length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-t-md bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
                          <span>Livre ({capacity - occupancyList.length})</span>
                        </div>
                      </div>
                    </div>

                    {/* Cabin Details Box */}
                    {selectedSeat ? (
                      <div className="bg-[#fafafa] dark:bg-slate-900/60 p-5 border border-[#e5e5e5] dark:border-slate-800 rounded-sm space-y-4 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <span className="text-xs font-black uppercase text-[#1b1b1b] dark:text-white tracking-widest">Poltrona {selectedSeat.seatNumber}</span>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight",
                            selectedSeat.isOccupied
                              ? selectedSeat.paymentStatus === PaymentStatus.PAGO
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50"
                                : selectedSeat.paymentStatus === PaymentStatus.PARCIAL
                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50"
                                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          )}>
                            {selectedSeat.isOccupied
                              ? selectedSeat.paymentStatus === PaymentStatus.PAGO
                                ? 'Pago'
                                : selectedSeat.paymentStatus === PaymentStatus.PARCIAL
                                  ? 'Parcial'
                                  : 'Pendente'
                              : 'Livre'
                            }
                          </span>
                        </div>

                        {selectedSeat.isOccupied ? (
                          <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                            <div>
                              <p className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider mb-0.5">Passageiro</p>
                              <p className="font-bold text-sm text-[#1b1b1b] dark:text-white">{selectedSeat.passengerName}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider mb-0.5">Documento / RG</p>
                              <p className="font-semibold text-[#333] dark:text-slate-200">{selectedSeat.document}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider mb-0.5">Congregação</p>
                              <p className="font-semibold text-[#0067b8] dark:text-blue-400">{selectedSeat.congregationName}</p>
                            </div>
                            {selectedSeat.notes && selectedSeat.notes !== 'Nenhuma' && (
                              <div>
                                <p className="text-[10px] font-extrabold text-[#707070] uppercase tracking-wider mb-0.5">Observações</p>
                                <p className="font-medium italic text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed bg-white dark:bg-slate-900 p-2 border border-slate-100 dark:border-slate-850 rounded-sm">
                                  {selectedSeat.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-slate-400 dark:text-slate-600">
                            <p className="font-semibold text-xs text-slate-550 dark:text-slate-455">Poltrona Livre</p>
                            <p className="text-[10px] mt-0.5">Este assento está atualmente disponível para ser preenchido por passageiros.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-[#fafafa] dark:bg-slate-900/20 p-6 border border-dashed border-slate-300 dark:border-slate-800 rounded-sm text-center py-10 transition-all duration-350">
                        <Users size={24} className="mx-auto text-slate-300 dark:text-slate-700 mb-2.5" />
                        <p className="text-xs font-bold text-slate-550 dark:text-slate-400 leading-normal max-w-xs mx-auto">
                          Toque em qualquer poltrona no mapa para visualizar os dados do passageiro correspondente!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>

        <div className="ms-card p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-[#f2f2f2] dark:bg-slate-800 flex items-center justify-center text-[#1b1b1b] dark:text-white rounded-sm transition-colors">
              <PieIcon size={16} />
            </div>
            <h2 className="text-lg font-semibold text-[#1b1b1b] dark:text-white">Status Financeiro</h2>
          </div>
          <div className="h-[200px] w-full relative mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-xl font-bold text-[#1b1b1b] dark:text-white">{totalPassengers}</p>
              <p className="text-[10px] text-[#707070] dark:text-slate-500 uppercase font-semibold">Total</p>
            </div>
          </div>
          <div className="space-y-1">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center justify-between py-2 border-b border-[#f2f2f2] dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-[#707070] dark:text-slate-400 font-medium">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-[#1b1b1b] dark:text-slate-200">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="ms-card p-8">
          <h3 className="text-base font-semibold text-[#1b1b1b] dark:text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="text-[#0067b8] dark:text-blue-400" size={18} />
            Ocupação Geral
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-2xl font-bold text-[#1b1b1b] dark:text-white tracking-tight">{occupationPercent.toFixed(1)}%</span>
              <span className="text-xs text-[#707070] dark:text-slate-400 font-medium">{occupiedSeats} / {totalSeats} assentos</span>
            </div>
            <div className="h-2 w-full bg-[#f2f2f2] dark:bg-slate-800 rounded-full overflow-hidden transition-colors">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${occupationPercent}%` }}
                className="h-full bg-[#0067b8] dark:bg-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="ms-card p-8 bg-[#fafafa] dark:bg-slate-900/50 relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-xs font-bold mb-6 flex items-center gap-2 text-[#0067b8] dark:text-blue-400 uppercase tracking-wider">
              <BusIcon size={16} />
              Logística de Frotas
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-semibold text-[#707070] dark:text-slate-400 uppercase tracking-wider mb-1">Lotados</p>
                <p className="text-2xl font-bold text-[#1b1b1b] dark:text-white">{fullBuses}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#707070] dark:text-slate-400 uppercase tracking-wider mb-1">Disponíveis</p>
                <p className="text-2xl font-bold text-[#1b1b1b] dark:text-white">{buses.length - fullBuses}</p>
              </div>
            </div>
          </div>
          <BusIcon size={80} className="absolute -right-4 -bottom-4 text-[#e5e5e5] dark:text-slate-700 opacity-40 dark:opacity-10 rotate-12" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
