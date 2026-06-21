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
import { useEvent } from '../contexts/EventContext';
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
  const { selectedEventId } = useEvent();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [congregations, setCongregations] = useState<any[]>([]);

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
      const allRes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
      const filteredRes = selectedEventId === 'all'
        ? allRes
        : allRes.filter(r => (r.eventId || 'default-congress-2026') === selectedEventId);
      setReservations(filteredRes);
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
  }, [appUser, selectedEventId]);

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
    { label: 'Passageiros', value: totalPassengers, icon: Users, color: 'text-indigo-600', subText: 'Assentos reservados' },
    { label: 'Vendas Totais', value: formatCurrency(totalGross), icon: TrendingUp, color: 'text-blue-600', subText: 'Total faturado' },
    { label: 'Valor Arrecadado', value: formatCurrency(totalCollected), icon: CheckCircle, color: 'text-emerald-600', subText: 'Confirmado em caixa' },
    { label: 'Valor Pendente', value: formatCurrency(totalPending), icon: Clock, color: 'text-rose-600', subText: 'Valores a receber' },
  ];

  // Calculate passengers per congregation
  const congregationData = congregations.map(c => {
    const passengersCount = reservations
      .filter(r => r.congregationId === c.id)
      .reduce((acc, r) => acc + (r.passengers?.length || 0), 0);
    return {
      name: c.name.length > 20 ? `${c.name.substring(0, 18)}...` : c.name,
      fullName: c.name,
      Passageiros: passengersCount
    };
  }).filter(item => item.Passageiros > 0)
    .sort((a, b) => b.Passageiros - a.Passageiros);

  const pieData = [
    { name: 'Pagos', value: paidCount, color: '#10b981' },
    { name: 'Parciais', value: partialCount, color: '#f59e0b' },
    { name: 'Pendentes', value: pendingCount, color: '#ef4444' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0067b8]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-[#1b1b1b] dark:text-white tracking-tight mb-1">Visão Geral</h1>
          <p className="text-sm text-[#707070] dark:text-slate-400">Insights em tempo real da operação logística e financeira</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            key={stat.label}
            className="ms-card p-5"
          >
            <p className="text-[10px] font-semibold text-[#707070] dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <stat.icon size={12} className={stat.color} />
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-[#1b1b1b] dark:text-white leading-none mb-1">{stat.value}</p>
            <p className="text-[11px] text-[#707070] dark:text-slate-500">{stat.subText}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Status Financeiro Card */}
        <div className="ms-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#f2f2f2] dark:bg-slate-800 flex items-center justify-center text-[#1b1b1b] dark:text-white rounded-sm transition-colors">
              <PieIcon size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1b1b1b] dark:text-white">Status Financeiro Reservas</h2>
              <p className="text-[11px] text-[#707070] dark:text-slate-400">Classificação por situação de checkout</p>
            </div>
          </div>
          <div className="h-[220px] w-full relative mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
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
              <p className="text-2xl font-black text-[#1b1b1b] dark:text-white">{totalReservations}</p>
              <p className="text-[10px] text-[#707070] dark:text-slate-500 uppercase font-semibold tracking-wider">Reservas</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {pieData.map(item => (
              <div key={item.name} className="flex flex-col items-center py-2.5 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60 rounded-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-[#707070] dark:text-slate-400 font-bold uppercase tracking-wider">{item.name}</span>
                </div>
                <span className="text-base font-bold text-[#1b1b1b] dark:text-slate-200">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Passengers per Congregation Card */}
        <div className="ms-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#f2f2f2] dark:bg-slate-800 flex items-center justify-center text-[#1b1b1b] dark:text-white rounded-sm transition-colors">
              <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1b1b1b] dark:text-white">Passageiros por Congregação</h2>
              <p className="text-[11px] text-[#707070] dark:text-slate-400">Total de reservas organizadas por localidade</p>
            </div>
          </div>
          <div className="h-[270px] w-full">
            {congregationData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded text-slate-400 dark:text-slate-600">
                <Users size={32} className="mb-2 opacity-50" />
                <p className="text-xs font-bold">Nenhum passageiro reservado</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={congregationData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                  <XAxis type="number" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} className="text-[10px]" />
                  <YAxis dataKey="name" type="category" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} className="text-[10px]" width={88} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                      borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                      color: theme === 'dark' ? '#f1f5f9' : '#0f172a'
                    }}
                    formatter={(value: any, name: any, props: any) => [value, 'Passageiros']}
                    labelFormatter={(label) => {
                      const found = congregationData.find(c => c.name === label);
                      return found ? found.fullName : label;
                    }}
                  />
                  <Bar dataKey="Passageiros" fill="#6366f1" radius={[0, 4, 4, 0]}>
                    {congregationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Ocupação Geral Card */}
        <div className="ms-card p-6 md:p-8">
          <h3 className="text-base font-semibold text-[#1b1b1b] dark:text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="text-[#0067b8] dark:text-blue-400" size={18} />
            Capacidade e Ocupação Geral
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-3xl font-extrabold text-[#1b1b1b] dark:text-white tracking-tight">{occupationPercent.toFixed(1)}%</span>
                <p className="text-[11px] text-[#707070] dark:text-slate-500 font-bold uppercase mt-1">Capacidade Total Atendida</p>
              </div>
              <span className="text-xs font-mono text-[#707070] dark:text-slate-400 font-bold">{occupiedSeats} ocupados de {totalSeats} poltronas</span>
            </div>
            <div className="h-2.5 w-full bg-[#f2f2f2] dark:bg-slate-800 rounded-full overflow-hidden transition-colors">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${occupationPercent}%` }}
                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 text-xs font-bold">
              <div className="bg-slate-50 dark:bg-slate-900/40 p-3 border border-slate-100 dark:border-slate-850 rounded-sm">
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Assentos Livres</span>
                <span className="text-base text-emerald-600 dark:text-emerald-400 font-black">{availableSeats}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/40 p-3 border border-slate-100 dark:border-slate-850 rounded-sm">
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Assentos Ocupados</span>
                <span className="text-base text-indigo-600 dark:text-indigo-400 font-black">{occupiedSeats}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logística de Frotas Card */}
        <div className="ms-card p-6 md:p-8 bg-[#fafafa] dark:bg-slate-900/50 relative overflow-hidden group">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold mb-6 flex items-center gap-2 text-[#0067b8] dark:text-blue-400 uppercase tracking-wider">
                <BusIcon size={16} />
                Logística de Frotas
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-[#707070] dark:text-slate-400 uppercase tracking-wider mb-1">Total Ônibus</p>
                  <p className="text-2xl font-bold text-[#1b1b1b] dark:text-white">{buses.length}</p>
                </div>
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
            
            <div className="mt-8 pt-4 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              A distribuição de poltronas é livre. Os passageiros acomodam-se de forma espontânea nos veículos designados.
            </div>
          </div>
          <BusIcon size={90} className="absolute -right-4 -bottom-4 text-[#e5e5e5] dark:text-slate-700 opacity-20 dark:opacity-5 rotate-12" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
