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
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!appUser) return;

    let resQuery = query(collection(db, 'reservations'));
    
    // Apply server-side filters to match security rules
    if (appUser.role === UserRole.COORDINATOR && appUser.congregationId) {
      resQuery = query(resQuery, where('congregationId', '==', appUser.congregationId));
    } else if (appUser.role === UserRole.USER) {
      resQuery = query(resQuery, where('createdBy', '==', appUser.uid));
    }

    const unsubRes = onSnapshot(resQuery, (snap) => {
      setReservations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));
      setLoading(false);
    });

    const unsubBuses = onSnapshot(collection(db, 'buses'), (snap) => {
      setBuses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus)));
    });

    return () => {
      unsubRes();
      unsubBuses();
    };
  }, [appUser]);

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

  // Chart Data: Occupation per Bus
  const busOccupationData = buses.map(bus => {
    const count = reservations
      .filter(r => r.busId === bus.id)
      .reduce((acc, r) => acc + (r.passengers?.length || 0), 0);
    return {
      name: bus.name,
      vagas: count,
      restante: Math.max(0, bus.capacity - count),
      capacity: bus.capacity
    };
  });

  const pieData = [
    { name: 'Pagos', value: paidCount, color: '#10b981' },
    { name: 'Parciais', value: partialCount, color: '#f59e0b' },
    { name: 'Pendentes', value: pendingCount, color: '#ef4444' }
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-semibold text-[#1b1b1b] tracking-tight mb-1">Visão Geral</h1>
          <p className="text-sm text-[#707070]">Insights em tempo real da operação logística</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-[#707070] bg-white px-4 py-2 border border-[#e5e5e5] shadow-sm">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] uppercase tracking-tighter">Live</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-[#0067b8]" />
            <span>{currentTime.toLocaleTimeString('pt-BR')}</span>
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
            <p className="text-[10px] font-semibold text-[#707070] uppercase tracking-wider mb-2 flex items-center gap-2">
              <stat.icon size={12} className={stat.color} />
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-[#1b1b1b]">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <div className="lg:col-span-2 ms-card p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-[#f2f2f2] flex items-center justify-center text-[#1b1b1b] rounded-sm">
              <TrendingUp size={16} />
            </div>
            <h2 className="text-lg font-semibold text-[#1b1b1b]">Ocupação da Frota</h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={busOccupationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#707070', fontSize: 11 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#707070', fontSize: 11 }} />
                <Tooltip 
                  cursor={{ fill: '#f2f2f2' }}
                  contentStyle={{ border: '1px solid #e5e5e5', borderRadius: '2px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="vagas" fill="#0067b8" radius={[2, 2, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ms-card p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-[#f2f2f2] flex items-center justify-center text-[#1b1b1b] rounded-sm">
              <PieIcon size={16} />
            </div>
            <h2 className="text-lg font-semibold text-[#1b1b1b]">Status Financeiro</h2>
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
              <p className="text-xl font-bold text-[#1b1b1b]">{totalPassengers}</p>
              <p className="text-[10px] text-[#707070] uppercase font-semibold">Total</p>
            </div>
          </div>
          <div className="space-y-1">
            {pieData.map(item => (
              <div key={item.name} className="flex items-center justify-between py-2 border-b border-[#f2f2f2] last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-[#707070] font-medium">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-[#1b1b1b]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div className="ms-card p-8">
          <h3 className="text-base font-semibold text-[#1b1b1b] mb-6 flex items-center gap-2">
            <AlertTriangle className="text-[#0067b8]" size={18} />
            Ocupação Geral
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-2xl font-bold text-[#1b1b1b] tracking-tight">{occupationPercent.toFixed(1)}%</span>
              <span className="text-xs text-[#707070] font-medium">{occupiedSeats} / {totalSeats} assentos</span>
            </div>
            <div className="h-2 w-full bg-[#f2f2f2] rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${occupationPercent}%` }}
                className="h-full bg-[#0067b8]"
              />
            </div>
          </div>
        </div>

        <div className="ms-card p-8 bg-[#fafafa] relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-xs font-bold mb-6 flex items-center gap-2 text-[#0067b8] uppercase tracking-wider">
              <BusIcon size={16} />
              Logística de Frotas
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-semibold text-[#707070] uppercase tracking-wider mb-1">Lotados</p>
                <p className="text-2xl font-bold text-[#1b1b1b]">{fullBuses}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#707070] uppercase tracking-wider mb-1">Disponíveis</p>
                <p className="text-2xl font-bold text-[#1b1b1b]">{buses.length - fullBuses}</p>
              </div>
            </div>
          </div>
          <BusIcon size={80} className="absolute -right-4 -bottom-4 text-[#e5e5e5] opacity-40 rotate-12" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
