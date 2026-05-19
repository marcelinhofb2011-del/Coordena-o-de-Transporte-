import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Activity, User, Clock, Trash2, Info, AlertCircle, FileText, DollarSign } from 'lucide-react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, AuditLog, LogAction } from '../types';
import { cn } from '../lib/utils';

export default function AuditLogsView() {
  const { appUser } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearHistory = async () => {
    setIsClearing(true);
    setShowConfirm(false);
    try {
      const q = query(collection(db, 'audit_logs'));
      const snapshot = await getDocs(q);
      
      const docs = snapshot.docs;
      const batches = [];
      
      // Firestore batch limit is 500 operations
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach(d => batch.delete(d.ref));
        batches.push(batch.commit());
      }
      
      await Promise.all(batches);
      // We don't need a browser alert here, the emptiness of the list is proof enough
    } catch (error) {
      console.error('Error clearing history:', error);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    if (appUser?.role !== UserRole.ADMIN) return;

    const q = query(
      collection(db, 'audit_logs'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
      setLoading(false);
    });

    return unsub;
  }, [appUser]);

  if (appUser?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
          <Activity size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-xs font-medium">
          Apenas administradores podem visualizar os logs de auditoria do sistema.
        </p>
      </div>
    );
  }

  const getActionIcon = (action: LogAction) => {
    switch (action) {
      case LogAction.RESERVATION_CREATE: return { icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' };
      case LogAction.RESERVATION_UPDATE: return { icon: Info, color: 'text-sky-600', bg: 'bg-sky-50' };
      case LogAction.RESERVATION_DELETE: return { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' };
      case LogAction.PAYMENT_UPDATE: return { icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' };
      default: return { icon: Info, color: 'text-slate-600', bg: 'bg-slate-50' };
    }
  };

  const formatActionName = (action: LogAction) => {
    switch (action) {
      case LogAction.RESERVATION_CREATE: return 'Reserva Criada';
      case LogAction.RESERVATION_UPDATE: return 'Reserva Atualizada';
      case LogAction.RESERVATION_DELETE: return 'Reserva Excluída';
      case LogAction.PAYMENT_UPDATE: return 'Pagamento Atualizado';
      default: return action;
    }
  };

  return (
    <div className="space-y-8 max-w-full pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-6">
        <div>
          <h1 className="text-4xl font-black text-[#1b1b1b] dark:text-white tracking-tight leading-none mb-3">Histórico de Atividade</h1>
          <p className="text-[#707070] dark:text-slate-400 font-medium tracking-tight">Registro detalhado de todas as operações realizadas no sistema.</p>
        </div>
        
        <button 
          onClick={() => setShowConfirm(true)}
          disabled={isClearing || logs.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/30 text-rose-500 dark:text-rose-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all disabled:opacity-30 shadow-sm shrink-0"
        >
          {isClearing ? <Clock className="animate-spin" size={14} /> : <Trash2 size={14} />}
          Limpar Histórico
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl text-center border border-black/5 dark:border-white/5">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/30 rounded-3xl flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto mb-8"><AlertCircle size={40} /></div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Limpar Histórico?</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 text-sm">Esta ação é irreversível e removerá todos os logs de atividade registrados.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowConfirm(false)} 
                className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                Voltar
              </button>
              <button 
                onClick={handleClearHistory} 
                className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 dark:shadow-none"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b-2 border-slate-900/5 dark:border-white/5">
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] w-[220px]">Evento</th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] w-[220px]">Responsável</th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Detalhes da Operação</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] w-[160px]">Data</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] w-[130px]">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/50">
              {logs.map((log) => {
                const cfg = getActionIcon(log.action);
                const dateObj = log.createdAt?.toDate();
                return (
                  <tr key={log.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-all group">
                    <td className="px-6 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-white/5", cfg.bg, cfg.color)}>
                          <cfg.icon size={16} />
                        </div>
                        <span className="font-black text-slate-900 dark:text-slate-200 text-[11px] uppercase tracking-widest">{formatActionName(log.action)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700 shadow-sm uppercase text-[10px] font-black">
                          {log.userName.substring(0, 2)}
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm tracking-tight">{log.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex gap-3 items-start max-w-xl">
                        <FileText size={14} className="text-slate-300 dark:text-slate-600 mt-1 shrink-0" />
                        <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">{log.details}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-center">
                      <span className="text-slate-900 dark:text-slate-300 font-black text-[11px] tabular-nums tracking-tighter uppercase">
                        {dateObj?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-6 py-6 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-black text-[11px] rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm tabular-nums">
                        <Clock size={12} />
                        {dateObj?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {logs.length === 0 && !loading && (
            <div className="py-40 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-slate-200 dark:text-slate-800 border border-slate-100 dark:border-slate-800 shadow-inner">
                <Activity size={40} />
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-[0.3em] text-[10px] mb-1">Silêncio no sistema</p>
                <p className="text-slate-300 dark:text-slate-700 text-[10px] font-medium uppercase tracking-widest">Nenhuma atividade registrada ainda</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
