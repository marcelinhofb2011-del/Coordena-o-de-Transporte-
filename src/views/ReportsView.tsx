import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { FileText, Download, Filter, FileSpreadsheet, File as FileIcon, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { db } from '../services/firebase';
import { Reservation, Bus, Congregation, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatCurrency, formatDate } from '../lib/utils';

const ReportsView: React.FC = () => {
  const { appUser } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  
  const [filterBus, setFilterBus] = useState('');
  const [filterCong, setFilterCong] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (!appUser) return;

    let resQuery = query(collection(db, 'reservations'));
    
    if (appUser.role === UserRole.COORDINATOR && appUser.congregationId) {
      resQuery = query(resQuery, where('congregationId', '==', appUser.congregationId));
    } else if (appUser.role === UserRole.USER) {
      resQuery = query(resQuery, where('createdBy', '==', appUser.uid));
    }

    const unsubRes = onSnapshot(resQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
      // Sort client-side by createdAt descending to avoid composite index requirements
      data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setReservations(data);
    }, (error) => {
      console.error("Error loading reporting reservations:", error);
    });
    const unsubB = onSnapshot(collection(db, 'buses'), snap => setBuses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus))));
    const unsubC = onSnapshot(collection(db, 'congregations'), snap => setCongregations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Congregation))));
    return () => { unsubRes(); unsubB(); unsubC(); };
  }, [appUser]);

  const filtered = reservations.filter(res => {
    const matchesBus = filterBus ? res.busId === filterBus : true;
    const matchesCong = filterCong ? res.congregationId === filterCong : true;
    const matchesStatus = filterStatus ? res.paymentStatus === filterStatus : true;
    let isVisible = true;
    if (appUser?.role === UserRole.COORDINATOR) isVisible = res.congregationId === appUser.congregationId;
    return matchesBus && matchesCong && matchesStatus && isVisible;
  });

  const totalGross = filtered.reduce((acc, r) => acc + r.totalValue, 0);
  const totalCollected = filtered.reduce((acc, r) => acc + r.amountPaid, 0);
  const totalPending = filtered.reduce((acc, r) => acc + (r.balance > 0 ? r.balance : 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Passageiro', 'Documento', 'Ônibus', 'Congregação', 'Dias', 'Total', 'Pago', 'Saldo', 'Status'];
    const rows = filtered.map(res => [
      res.passengers?.[0]?.name || 'N/A',
      res.passengers?.[0]?.document || 'N/A',
      buses.find(b => b.id === res.busId)?.name || 'N/A',
      congregations.find(c => c.id === res.congregationId)?.name || 'N/A',
      res.days?.join('; ') || '',
      res.totalValue,
      res.amountPaid,
      res.balance,
      res.paymentStatus
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">Logs Financeiros</h1>
          <p className="text-slate-500 font-medium">Relatório detalhado de vendas e arrecadação</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportCSV} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all shadow-sm">
            <FileSpreadsheet size={18} />
            Exportar CSV
          </button>
          <button onClick={handlePrint} className="bg-white border border-slate-100 text-slate-900 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
            <Download size={18} />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-slate-100 print:hidden mb-12">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Ônibus</label>
          <select className="w-full px-0 py-3 bg-transparent border-b border-slate-200 outline-none font-bold text-slate-700 focus:border-indigo-500 transition-all" value={filterBus} onChange={e => setFilterBus(e.target.value)}>
            <option value="">Todos os Ônibus</option>
            {buses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Congregação</label>
          <select className="w-full px-0 py-3 bg-transparent border-b border-slate-200 outline-none font-bold text-slate-700 focus:border-indigo-500 transition-all" value={filterCong} onChange={e => setFilterCong(e.target.value)}>
            <option value="">Todas as Congregações</option>
            {congregations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pagamento</label>
          <select className="w-full px-0 py-3 bg-transparent border-b border-slate-200 outline-none font-bold text-slate-700 focus:border-indigo-500 transition-all" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os Status</option>
            <option value="PAGO">Pago</option>
            <option value="PENDENTE">Pendente</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        <div className="group">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-slate-400 flex items-center gap-2">
            <TrendingUp size={12} className="text-indigo-500" />
            Total das Passagens
          </p>
          <p className="text-5xl font-black tracking-tighter text-slate-900">{formatCurrency(totalGross)}</p>
        </div>
        <div className="group">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 text-slate-400 flex items-center gap-2">
            <AlertCircle size={12} className="text-rose-500" />
            Saldo Devedor
          </p>
          <p className="text-5xl font-black tracking-tighter text-rose-500">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pl-6 px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Passageiro</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transporte</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Grupo</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
              <th className="pr-6 px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(res => (
              <tr key={res.id} className="group hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                <td className="pl-6 px-4 py-6">
                  <p className="font-black text-slate-900 text-lg tracking-tight group-hover:text-white">
                    {res.passengers?.[0]?.name || 'Sem nome'}
                    {(res.passengers?.length || 0) > 1 && <span className="text-indigo-600 ml-3 text-sm font-bold group-hover:text-indigo-400">+{res.passengers.length - 1}</span>}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-500">{res.passengers?.[0]?.document}</p>
                </td>
                <td className="px-4 py-6 font-bold text-slate-600 text-sm italic group-hover:text-slate-400">{buses.find(b => b.id === res.busId)?.name}</td>
                <td className="px-4 py-6 font-bold text-slate-500 text-sm group-hover:text-slate-400">{congregations.find(c => c.id === res.congregationId)?.name}</td>
                <td className="px-4 py-6">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                    res.paymentStatus === 'PAGO' ? "bg-emerald-500 text-white" : "bg-orange-500 text-white group-hover:bg-orange-600"
                  )}>
                    {res.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-6 font-black text-slate-900 text-right text-lg group-hover:text-white">{formatCurrency(res.totalValue)}</td>
                <td className="pr-6 px-4 py-6 font-black text-rose-500 text-right text-lg group-hover:text-rose-400">{formatCurrency(res.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportsView;
