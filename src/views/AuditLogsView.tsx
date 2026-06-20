import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import { 
  Activity, 
  User, 
  Clock, 
  Trash2, 
  Info, 
  AlertCircle, 
  FileText, 
  DollarSign, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  CheckCircle2, 
  X, 
  ExternalLink,
  Layers,
  Percent
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Iframe & Print Modal state
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsIframe(window.self !== window.top);
    }
  }, []);

  const handleClearHistory = async () => {
    setIsClearing(true);
    setShowConfirm(false);
    try {
      const q = query(collection(db, 'audit_logs'));
      const snapshot = await getDocs(q);
      
      const docs = snapshot.docs;
      const batches = [];
      
      for (let i = 0; i < docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + 500);
        chunk.forEach(d => batch.delete(d.ref));
        batches.push(batch.commit());
      }
      
      await Promise.all(batches);
    } catch (error) {
      console.error('Error clearing history:', error);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    if (appUser?.role !== UserRole.ADMIN) return;

    // Load up to 150 documents for comprehensive audit trails
    const q = query(
      collection(db, 'audit_logs'),
      orderBy('createdAt', 'desc'),
      limit(150)
    );

    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
      setLoading(false);
    });

    return unsub;
  }, [appUser]);

  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('print') === 'true' && urlParams.get('tab') === 'audit-logs') {
        const timer = setTimeout(() => {
          window.print();
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [loading]);

  if (appUser?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
          <Activity size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 animate-fade-in">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-xs font-medium">
          Apenas administradores podem visualizar os logs de auditoria do sistema.
        </p>
      </div>
    );
  }

  // Action Configurations helper
  const getActionConfig = (action: LogAction) => {
    switch (action) {
      case LogAction.RESERVATION_CREATE: 
        return { 
          icon: CheckCircle2, 
          label: 'Reserva Criada',
          color: 'text-indigo-600 dark:text-indigo-400', 
          bg: 'bg-indigo-50 dark:bg-indigo-950/45',
          border: 'border-indigo-100 dark:border-indigo-900/30'
        };
      case LogAction.RESERVATION_UPDATE: 
        return { 
          icon: Info, 
          label: 'Reserva Editada',
          color: 'text-sky-600 dark:text-sky-400', 
          bg: 'bg-sky-50 dark:bg-sky-950/45',
          border: 'border-sky-100 dark:border-sky-900/30'
        };
      case LogAction.RESERVATION_DELETE: 
        return { 
          icon: AlertCircle, 
          label: 'Reserva Excluída',
          color: 'text-rose-600 dark:text-rose-405', 
          bg: 'bg-rose-50 dark:bg-rose-950/45',
          border: 'border-rose-100 dark:border-rose-900/30'
        };
      case LogAction.PAYMENT_UPDATE: 
        return { 
          icon: DollarSign, 
          label: 'Pagamento Atualizado',
          color: 'text-emerald-700 dark:text-emerald-450', 
          bg: 'bg-emerald-50 dark:bg-emerald-950/45',
          border: 'border-emerald-100 dark:border-emerald-900/30'
        };
      default: 
        return { 
          icon: Info, 
          label: action,
          color: 'text-slate-600 dark:text-slate-400', 
          bg: 'bg-slate-50 dark:bg-slate-800/40',
          border: 'border-slate-200 dark:border-slate-800'
        };
    }
  };

  // Safe string representation of date object formatting
  const formatDateValue = (dateObj: Date | undefined) => {
    if (!dateObj) return 'N/A';
    return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTimeValue = (dateObj: Date | undefined) => {
    if (!dateObj) return 'N/A';
    return dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'});
  };

  // Filter logs reactively
  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const userNameMatch = log.userName?.toLowerCase().includes(term);
      const detailsMatch = log.details?.toLowerCase().includes(term);
      if (!userNameMatch && !detailsMatch) return false;
    }

    if (log.createdAt) {
      const dateObj = log.createdAt.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
      if (startDate) {
        const start = new Date(startDate + 'T00:00:00');
        if (dateObj < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate + 'T23:59:59');
        if (dateObj > end) return false;
      }
    }

    return true;
  });

  // Calculate dynamic metrics from all loaded raw logs
  const totalLogsCount = logs.length;
  const filteredLogsCount = filteredLogs.length;
  const createdLogsCount = logs.filter(l => l.action === LogAction.RESERVATION_CREATE).length;
  const paymentLogsCount = logs.filter(l => l.action === LogAction.PAYMENT_UPDATE).length;
  const deleteLogsCount = logs.filter(l => l.action === LogAction.RESERVATION_DELETE).length;
  const editLogsCount = logs.filter(l => l.action === LogAction.RESERVATION_UPDATE).length;

  const handlePrint = () => {
    if (isIframe) {
      setShowPrintModal(true);
    } else {
      window.print();
    }
  };

  const handleExportPDF = async () => {
    try {
      const element = document.getElementById('audit-log-pdf-area');
      if (!element) return;

      const originalStyle = element.getAttribute('style') || '';

      element.style.width = '1120px';
      element.style.maxWidth = '1120px';
      element.style.padding = '30px';
      element.classList.add('pdf-render-mode');
      
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1120,
        windowWidth: 1120
      });

      if (originalStyle) {
        element.setAttribute('style', originalStyle);
      } else {
        element.removeAttribute('style');
      }
      element.classList.remove('pdf-render-mode');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`relatorio-auditoria-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="audit-log-pdf-area" className="space-y-6 max-w-7xl mx-auto px-1 print:p-0 print:max-w-full">
      
      {/* ---------------------------------------------------- */}
      {/* PROFESSIONAL TITLE HEADER (PRINT OPTIMIZED) */}
      {/* ---------------------------------------------------- */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          {/* Print only brand title */}
          <div className="hidden print:block mb-4 text-center border-b-2 border-slate-900 pb-4">
            <h2 className="text-xl font-bold tracking-tight uppercase">Sistema de Gestão de Transportes e Frotas</h2>
            <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900 mt-1">Livro e Relatório de Auditoria de Atividade</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">Conferência Oficial de Logs de Mudança e Segurança • Emissão: {new Date().toLocaleString('pt-BR')}</p>
          </div>
          
          <span className="text-[10px] font-black tracking-widest text-[#0067b8] dark:text-blue-400 uppercase font-mono print:hidden">
            Área de Segurança e Auditoria
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-none mt-1 print:hidden">
            Histórico de Atividade
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 print:hidden">
            Log detalhado de Auditoria para rastreabilidade de todas as ações de usuários, reservas e pagamentos.
          </p>
          
          {/* Informational tip */}
          <div className="mt-2 text-[11px] text-[#0067b8] dark:text-blue-400 font-semibold print:hidden flex items-center gap-1.5">
            <AlertCircle size={12} className="shrink-0 text-[#0067b8] dark:text-blue-400" />
            <span>Dica: Para gerar um demonstrativo de alta fidelidade e textos copiáveis, prefira clicar em <strong>Imprimir</strong> e escolha a opção <strong>"Salvar como PDF"</strong>.</span>
          </div>
        </div>

        {/* Buttons Action bar */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer size={13} />
            <span>Imprimir</span>
          </button>
          
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-850 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 rounded-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer border border-transparent"
          >
            <Download size={13} />
            <span>Salvar PDF</span>
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            disabled={isClearing || logs.length === 0}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-sm flex items-center justify-center gap-1.5 shadow-xs cursor-pointer font-extrabold disabled:opacity-30"
          >
            <Trash2 size={13} />
            <span>Limpar Histórico</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* LOG DATA RECTANGULAR STATS CARDS */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Events */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-sm flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] font-extrabold uppercase tracking-wider font-mono">Volume Total</span>
            <Activity size={14} className="text-slate-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs text-slate-400 mb-0.5 font-semibold">Operações Carregadas</p>
            <p className="text-xl md:text-2xl font-mono font-bold text-slate-900 dark:text-slate-100">{totalLogsCount}</p>
          </div>
        </div>

        {/* Create Events */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-sm flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] font-extrabold uppercase tracking-wider font-mono">Processamentos</span>
            <CheckCircle2 size={14} className="text-indigo-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs text-slate-400 mb-0.5 font-semibold">Novas Reservas</p>
            <p className="text-xl md:text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400">{createdLogsCount}</p>
          </div>
        </div>

        {/* Change / Update Events */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-sm flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] font-extrabold uppercase tracking-wider font-mono">Controle de Reservas</span>
            <DollarSign size={14} className="text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs text-slate-400 mb-0.5 font-semibold">Atualizações de Pagamento</p>
            <p className="text-xl md:text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">{paymentLogsCount}</p>
          </div>
        </div>

        {/* High Risk / Alterations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-sm flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] font-extrabold uppercase tracking-wider font-mono">Modificações</span>
            <AlertCircle size={14} className="text-amber-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs text-slate-400 mb-0.5 font-semibold">Edições e Exclusões</p>
            <p className="text-xl md:text-2xl font-mono font-bold text-amber-600 dark:text-amber-505">
              {editLogsCount + deleteLogsCount}
            </p>
          </div>
        </div>

      </div>

      {/* ---------------------------------------------------- */}
      {/* FILTROS SECTION */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-sm print:hidden">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-850 pb-2">
          <Filter size={13} className="text-slate-400" />
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Filtros de Log</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Termo de Busca */}
          <div className="relative">
            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-mono">Pesquisar</label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Responsável ou detalhes..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-550 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm text-xs font-medium focus:outline-none focus:border-[#0067b8] text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Tipo de Operação */}
          <div>
            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-mono">Tipo de Evento</label>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="mt-1 w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-sm text-xs font-semibold focus:outline-none focus:border-[#0067b8] text-slate-700 dark:text-slate-200"
            >
              <option value="all">⚡ Todos os Eventos</option>
              <option value={LogAction.RESERVATION_CREATE}>➕ Reserva Criada</option>
              <option value={LogAction.RESERVATION_UPDATE}>✏️ Reserva Editada</option>
              <option value={LogAction.RESERVATION_DELETE}>❌ Reserva Excluída</option>
              <option value={LogAction.PAYMENT_UPDATE}>💰 Confirmação de Pagamento</option>
            </select>
          </div>

          {/* Data de Início */}
          <div>
            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-mono">Data Inicial</label>
            <div className="relative mt-1 flex items-center">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm text-xs font-medium focus:outline-none focus:border-[#0067b8] text-slate-700 dark:text-slate-200 animate-none"
              />
            </div>
          </div>

          {/* Data Final */}
          <div>
            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-mono">Data Final</label>
            <div className="relative mt-1 flex items-center">
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm text-xs font-medium focus:outline-none focus:border-[#0067b8] text-slate-700 dark:text-slate-200 animate-none"
              />
            </div>
          </div>
        </div>

        {/* Clear Filters indicator */}
        {(searchTerm || filterAction !== 'all' || startDate || endDate) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterAction('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-[10px] font-extrabold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider"
            >
              × Limpar filtros ativos
            </button>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* DETAILED LEDGER TABLE BLOCK */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-sm overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">Registros de Transação</h4>
            <p className="text-[10px] text-slate-400 font-medium font-sans">
              Mostrando {filteredLogsCount} de {totalLogsCount} lançamentos na listagem ativa
            </p>
          </div>
        </div>

        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-slate-600 dark:text-slate-350">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[9px] uppercase">
                  <th className="py-2.5 px-4">Operação</th>
                  <th className="py-2.5 px-4">Responsável</th>
                  <th className="py-2.5 px-4">Detalhamento dos Dados</th>
                  <th className="py-2.5 px-4 text-center">Data Evento</th>
                  <th className="py-2.5 px-4 text-center">Horário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                {filteredLogs.map((log) => {
                  const cfg = getActionConfig(log.action);
                  const dateObj = log.createdAt?.toDate ? log.createdAt.toDate() : (log.createdAt ? new Date(log.createdAt) : null);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/45 font-sans">
                      {/* Operação */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-black text-[9px] uppercase tracking-wider border",
                          cfg.bg, cfg.color, cfg.border
                        )}>
                          <cfg.icon size={11} className="shrink-0" />
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Responsável */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-550 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-black text-[8px] uppercase tracking-wider">
                            {log.userName ? log.userName.substring(0, 2) : 'US'}
                          </div>
                          <span className="font-bold text-slate-850 dark:text-slate-100 text-xs tracking-tight">{log.userName}</span>
                        </div>
                      </td>

                      {/* Detalhamento */}
                      <td className="py-2.5 px-4 max-w-md">
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium font-sans leading-relaxed break-words italic">
                          {log.details || "Sem detalhes adicionais registrados."}
                        </p>
                      </td>

                      {/* Data */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-center text-slate-800 dark:text-slate-200 font-mono text-xs font-bold">
                        {dateObj ? formatDateValue(dateObj) : 'N/A'}
                      </td>

                      {/* Hora */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-center font-sans">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-805 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 text-[10px] rounded-sm font-mono tracking-tight font-bold">
                          <Clock size={10} className="text-slate-450" />
                          {dateObj ? formatTimeValue(dateObj) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12">
                      <div className="flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-sm flex items-center justify-center text-slate-300 dark:text-slate-700 border border-slate-150 dark:border-slate-850">
                          <Activity size={24} />
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest text-[10px] mb-1">Nenhum evento localizado</p>
                          <p className="text-slate-300 dark:text-slate-700 text-[10px] font-medium uppercase tracking-wider">Experimente ajustar os filtros aplicados</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* CONFIRMATION CLEAR MODAL */}
      {/* ---------------------------------------------------- */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden animate-fade-in animate-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-sm w-full max-w-sm p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 rounded-sm flex items-center justify-center text-rose-500 dark:text-rose-450 mx-auto mb-4 border border-rose-150 animate-none">
              <Trash2 size={20} />
            </div>
            
            <h3 className="text-sm font-extrabold uppercase text-slate-800 dark:text-slate-100 tracking-wider mb-2">
              Confirmar Limpeza?
            </h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-sans mb-6">
              Esta ação é irreversível e excluirá permanentemente todos os registros de logs de auditoria do sistema. Tem certeza de que deseja prosseguir?
            </p>

            <div className="flex gap-2 font-sans">
              <button 
                onClick={() => setShowConfirm(false)} 
                className="flex-1 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-205 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={handleClearHistory} 
                className="flex-1 py-2 text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-sm cursor-pointer transition-all shadow-xs"
              >
                Sim, Limpar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* IFRAME PRINT INSTRUCTIONS MODAL */}
      {/* ---------------------------------------------------- */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden animate-fade-in animate-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-sm w-full max-w-lg p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowPrintModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-sm bg-amber-50 dark:bg-amber-950/30 text-amber-600 shrink-0 border border-amber-150">
                <Printer size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold uppercase text-slate-800 dark:text-slate-100 tracking-wider">
                  Dica de Impressão (Iframe)
                </h3>
                <p className="text-[10px] font-mono text-[#0067b8] dark:text-blue-400 mt-0.5">
                  Proteção de conteúdo do navegador ativa
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans border-y border-slate-100 dark:border-slate-850 py-4 mb-5">
              <p>
                Por segurança, os navegadores modernos bloqueiam o comando direto de impressão (<strong>window.print()</strong>) quando ele é executado de dentro de um iframe integrado, como este painel lateral.
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Para obter seu demonstrativo de auditoria completo, escolha:
              </p>
              <ul className="list-decimal list-inside space-y-1.5 pl-1 font-medium">
                <li>
                  <span className="text-slate-800 dark:text-white font-bold">Salvar PDF Direto</span>: Gera instantaneamente o arquivo PDF ajustado para desktop com todas as colunas visíveis.
                </li>
                <li>
                  <span className="text-slate-800 dark:text-white font-bold">Abrir e Imprimir</span>: Abre o histórico em uma nova guia exclusiva de tela inteira, onde a ferramenta de impressão original do navegador é disparada instantaneamente sem bloqueios.
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end font-sans">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm cursor-pointer font-sans"
              >
                Fechar
              </button>
              
              <button
                onClick={async () => {
                  setShowPrintModal(false);
                  await handleExportPDF();
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-850 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 rounded-sm flex items-center justify-center gap-1.5 cursor-pointer border border-transparent font-sans"
              >
                <Download size={14} />
                <span>Salvar PDF Direto</span>
              </button>

              <a
                href={`${window.location.origin}${window.location.pathname}?tab=audit-logs&print=true`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#0067b8] hover:bg-[#005da6] rounded-sm flex items-center justify-center gap-1.5 text-center cursor-pointer shadow-xs font-bold font-sans"
              >
                <ExternalLink size={14} />
                <span>Abrir e Imprimir</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
