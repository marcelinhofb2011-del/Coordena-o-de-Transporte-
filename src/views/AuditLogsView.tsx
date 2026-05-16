import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Activity, User, Calendar, Tag, Info, AlertCircle } from 'lucide-react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, AuditLog, LogAction } from '../types';
import { cn } from '../lib/utils';

export default function AuditLogsView() {
  const { appUser } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

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
      case LogAction.PAYMENT_UPDATE: return { icon: Tag, color: 'text-emerald-600', bg: 'bg-emerald-50' };
      default: return { icon: Info, color: 'text-slate-600', bg: 'bg-slate-50' };
    }
  };

  const formatActionName = (action: string) => {
    return action.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">Histórico de Atividade</h1>
        <p className="text-slate-500 font-medium tracking-tight">Transparência total em cada alteração do sistema</p>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden p-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] rounded-l-2xl">Evento</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Responsável</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Detalhes</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] rounded-r-2xl text-right">Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const cfg = getActionIcon(log.action);
                return (
                  <tr key={log.id} className="group hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-5 rounded-l-3xl">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", cfg.bg, cfg.color)}>
                          <cfg.icon size={18} />
                        </div>
                        <span className="font-black text-slate-900 text-xs uppercase tracking-widest">{formatActionName(log.action)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <User size={14} />
                        </div>
                        <span className="font-bold text-slate-600 text-sm">{log.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-semibold text-slate-400 leading-relaxed max-w-xs">{log.details}</p>
                    </td>
                    <td className="px-6 py-5 rounded-r-3xl text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-slate-900 font-black text-xs tracking-tighter">
                          {log.createdAt?.toDate().toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {log.createdAt?.toDate().toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && !loading && (
          <div className="py-20 text-center">
            <Activity size={48} className="mx-auto text-slate-100 mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum log disponível</p>
          </div>
        )}
      </div>
    </div>
  );
}
