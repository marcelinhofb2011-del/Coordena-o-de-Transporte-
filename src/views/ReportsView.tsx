import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  FileText, 
  Download, 
  Filter, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Printer, 
  Search, 
  DollarSign, 
  Building2, 
  Bus as BusIcon, 
  Layers, 
  Wallet, 
  Percent,
  RefreshCw,
  FileCheck,
  Edit2,
  ExternalLink,
  X
} from 'lucide-react';
import { db } from '../services/firebase';
import { Reservation, Bus, Congregation, UserRole, PaymentStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatCurrency, formatDate } from '../lib/utils';

const ReportsView: React.FC = () => {
  const { appUser } = useAuth();
  
  // Base State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBus, setFilterBus] = useState('');
  const [filterCong, setFilterCong] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');

  // Audit / Expense State (Saved locally for session or report printing)
  const [charterExpense, setCharterExpense] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<number>(0);
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [signeeName, setSigneeName] = useState<string>(appUser?.name || '');
  const [signeeRole, setSigneeRole] = useState<string>('Responsável Financeiro');
  
  // Display tab for Grouping Summaries
  const [groupingTab, setGroupingTab] = useState<'congregation' | 'bus' | 'method'>('congregation');

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'paid' | 'balance'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Iframe & Print Modal state
  const [isIframe, setIsIframe] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsIframe(window.self !== window.top);
    }
  }, []);

  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('print') === 'true') {
        const timer = setTimeout(() => {
          window.print();
        }, 1200); // Allow some time to fully load all data nodes
        return () => clearTimeout(timer);
      }
    }
  }, [loading]);

  useEffect(() => {
    if (!appUser) return;

    let resQuery = query(collection(db, 'reservations'));
    
    if ((appUser.role === UserRole.COORDINATOR || appUser.role === UserRole.USER || appUser.role === UserRole.ASSISTANT) && appUser.congregationId) {
      resQuery = query(resQuery, where('congregationId', '==', appUser.congregationId));
    }

    const unsubRes = onSnapshot(resQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
      // Sort client-side by default
      data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setReservations(data);
      setLoading(false);
    }, (error) => {
      console.error("Error loading reporting reservations:", error);
      setLoading(false);
    });

    const unsubB = onSnapshot(collection(db, 'buses'), snap => {
      setBuses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus)));
    });

    const unsubC = onSnapshot(collection(db, 'congregations'), snap => {
      setCongregations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Congregation)));
    });

    return () => { unsubRes(); unsubB(); unsubC(); };
  }, [appUser]);

  // Apply Search and Filters
  const filtered = reservations.filter(res => {
    const mainPassenger = res.passengers?.[0]?.name || '';
    const otherPassengers = res.passengers?.slice(1).map(p => p.name).join(' ') || '';
    const allNames = `${mainPassenger} ${otherPassengers} ${res.notes || ''}`.toLowerCase();
    
    const matchesSearch = searchTerm ? allNames.includes(searchTerm.toLowerCase()) : true;
    const matchesBus = filterBus ? res.busId === filterBus : true;
    const matchesCong = filterCong ? res.congregationId === filterCong : true;
    const matchesStatus = filterStatus ? res.paymentStatus === filterStatus : true;
    const matchesMethod = filterPaymentMethod ? res.paymentMethod === filterPaymentMethod : true;
    
    let isVisible = true;
    if (appUser?.role === UserRole.COORDINATOR) {
      isVisible = res.congregationId === appUser.congregationId;
    }
    
    return matchesSearch && matchesBus && matchesCong && matchesStatus && matchesMethod && isVisible;
  });

  // Sort Filtered Data
  const sortedFiltered = [...filtered].sort((a, b) => {
    let factor = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'name') {
      const nameA = a.passengers?.[0]?.name || '';
      const nameB = b.passengers?.[0]?.name || '';
      return nameA.localeCompare(nameB) * factor;
    }
    if (sortBy === 'value') {
      return (a.totalValue - b.totalValue) * factor;
    }
    if (sortBy === 'paid') {
      return (a.amountPaid - b.amountPaid) * factor;
    }
    if (sortBy === 'balance') {
      return (a.balance - b.balance) * factor;
    }
    return 0;
  });

  const handleSort = (field: 'name' | 'value' | 'paid' | 'balance') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // ----------------------------------------------------
  // CONSOLIDATED CALCULATIONS
  // ----------------------------------------------------
  const totalGross = filtered.reduce((acc, r) => acc + (r.totalValue || 0), 0);
  const totalCollected = filtered.reduce((acc, r) => acc + (r.amountPaid || 0), 0);
  const totalPending = filtered.reduce((acc, r) => acc + (r.balance > 0 ? r.balance : 0), 0);
  const totalSeatsSold = filtered.reduce((acc, r) => acc + (r.passengers?.length || 0), 0);
  
  // Adimplência
  const adimplenciaRate = totalGross > 0 ? (totalCollected / totalGross) * 100 : 0;

  // Expenses and balance computations
  const totalExpenses = Number(charterExpense) + Number(otherExpenses);
  const netBalance = totalCollected - totalExpenses;

  // ----------------------------------------------------
  // GROUPED COMPUTATIONS (CONGREGATION / BUS / METHOD)
  // ----------------------------------------------------
  
  // 1. Grouped by Congregation
  const congregationGrouped = congregations.map(cong => {
    const congReservations = filtered.filter(r => r.congregationId === cong.id);
    const gross = congReservations.reduce((acc, r) => acc + (r.totalValue || 0), 0);
    const paid = congReservations.reduce((acc, r) => acc + (r.amountPaid || 0), 0);
    const pending = congReservations.reduce((acc, r) => acc + (r.balance > 0 ? r.balance : 0), 0);
    const tickets = congReservations.reduce((acc, r) => acc + (r.passengers?.length || 0), 0);
    const pct = gross > 0 ? (paid / gross) * 100 : 0;

    return {
      id: cong.id,
      name: cong.name,
      gross,
      paid,
      pending,
      tickets,
      pct
    };
  }).filter(c => c.tickets > 0); // Only show congregations with active filtered reservations

  // 2. Grouped by Bus
  const busGrouped = buses.map(bus => {
    const busReservations = filtered.filter(r => r.busId === bus.id);
    const gross = busReservations.reduce((acc, r) => acc + (r.totalValue || 0), 0);
    const paid = busReservations.reduce((acc, r) => acc + (r.amountPaid || 0), 0);
    const pending = busReservations.reduce((acc, r) => acc + (r.balance > 0 ? r.balance : 0), 0);
    const tickets = busReservations.reduce((acc, r) => acc + (r.passengers?.length || 0), 0);
    const pct = gross > 0 ? (paid / gross) * 100 : 0;

    return {
      id: bus.id,
      name: bus.name,
      number: bus.number,
      capacity: bus.capacity,
      gross,
      paid,
      pending,
      tickets,
      pct
    };
  }).filter(b => b.tickets > 0); // Only show buses with active filtered passengers

  // 3. Grouped by Payment Method
  const paymentMethodsList = ['Pix', 'Dinheiro', 'Transferência', 'Outro'];
  const methodGrouped = paymentMethodsList.map(method => {
    const methodReservations = filtered.filter(r => (r.paymentMethod || 'Pix').toLowerCase() === method.toLowerCase());
    const gross = methodReservations.reduce((acc, r) => acc + (r.totalValue || 0), 0);
    const paid = methodReservations.reduce((acc, r) => acc + (r.amountPaid || 0), 0);
    const pending = methodReservations.reduce((acc, r) => acc + (r.balance > 0 ? r.balance : 0), 0);
    const tickets = methodReservations.reduce((acc, r) => acc + (r.passengers?.length || 0), 0);

    return {
      name: method,
      gross,
      paid,
      pending,
      tickets
    };
  }).filter(m => m.tickets > 0);

  // ----------------------------------------------------
  // EXPORTS & HELPERS
  // ----------------------------------------------------
  const handlePrint = () => {
    if (isIframe) {
      setShowPrintModal(true);
    } else {
      window.print();
    }
  };

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const element = document.getElementById('report-pdf-area');
      if (!element) return;

      // Save original inline style attribute so we can restore it perfectly
      const originalStyle = element.getAttribute('style') || '';

      // Force a desktop-grade 1120px viewport layout temporarily
      element.style.width = '1120px';
      element.style.maxWidth = '1120px';
      element.style.padding = '30px';
      element.classList.add('pdf-render-mode');
      
      // Let any reflow or rendering transition complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2, // High resolution crisp text
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1120, // Force strict output width
        windowWidth: 1120 // Force strict internal responsive media queries to match desktop!
      });

      // Restore styling perfectly
      if (originalStyle) {
        element.setAttribute('style', originalStyle);
      } else {
        element.removeAttribute('style');
      }
      element.classList.remove('pdf-render-mode');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Demonstrativo_Financeiro_Fechamento_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF profissional:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Passageiro Responsavel', 'Documento', 'Ônibus', 'Congregação', 'Dias', 'Método', 'Total', 'Pago', 'Saldo', 'Status'];
    const rows = filtered.map(res => [
      res.createdAt ? formatDate(res.createdAt) : 'N/A',
      res.passengers?.[0]?.name || 'N/A',
      res.passengers?.[0]?.document || 'N/A',
      buses.find(b => b.id === res.busId)?.name || 'N/A',
      congregations.find(c => c.id === res.congregationId)?.name || 'N/A',
      res.days?.join('; ') || '',
      res.paymentMethod || 'Pix',
      res.totalValue,
      res.amountPaid,
      res.balance,
      res.paymentStatus
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Demonstrativo_Financeiro_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="report-pdf-area" className="space-y-6 max-w-7xl mx-auto px-1 print:p-0 print:max-w-full">
      
      {/* ---------------------------------------------------- */}
      {/* PROFESSIONAL TITLE HEADER (PRINT OPTIMIZED) */}
      {/* ---------------------------------------------------- */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          {/* Print only brand title */}
          <div className="hidden print:block mb-4 text-center border-b-2 border-slate-900 pb-4">
            <h2 className="text-xl font-bold tracking-tight uppercase">Sistema de Gestão de Transportes e Frotas</h2>
            <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900 mt-1">Demonstrativo Financeiro de Fechamento</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">Conferência de Caixa, Depósitos e Valores Ativos • Emissão: {new Date().toLocaleString('pt-BR')}</p>
          </div>
          
          <span className="text-[10px] font-black tracking-widest text-[#0067b8] dark:text-blue-400 uppercase font-mono print:hidden">
            Área de Auditoria e Tesouraria
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-none mt-1 print:hidden">
            Demonstrativo Financeiro
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5 print:hidden">
            Relatório de auditoria para confrontar valores físicos coletados com registros no sistema.
          </p>
          {/* Informational helpful tip */}
          <div className="mt-2 text-[11px] text-[#0067b8] dark:text-blue-400 font-semibold print:hidden flex items-center gap-1.5">
            <AlertCircle size={12} className="shrink-0 text-[#0067b8] dark:text-blue-400" />
            <span>Dica: Para gerar um demonstrativo multipáginas de alta fidelidade e textos copiáveis, prefira clicar em <strong>Imprimir</strong> e escolha a opção <strong>"Salvar como PDF"</strong>.</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto print:hidden">
          <button 
            onClick={handleExportCSV} 
            className="flex-1 md:flex-none border border-slate-200 dark:border-slate-850 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-sm font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Planilha CSV</span>
          </button>

          <button 
            onClick={handlePrint} 
            className="flex-1 md:flex-none border border-slate-200 dark:border-slate-850 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-sm font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Printer size={15} />
            <span>Imprimir</span>
          </button>
          
          <button 
            onClick={handleExportPDF} 
            disabled={isGeneratingPDF}
            className="flex-1 md:flex-none bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-4 py-2 rounded-sm font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isGeneratingPDF ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                <span>Proces...</span>
              </span>
            ) : (
              <>
                <Download size={15} />
                <span>Salvar PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* AUDIT METADATA CARD (INFO PANEL) */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-850 p-4 rounded-sm flex flex-col md:flex-row justify-between gap-4 text-xs font-medium">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Emissor do Relatório</p>
            <p className="text-[#1b1b1b] dark:text-slate-100 font-bold">{appUser?.name || 'Não identificado'}</p>
            <p className="text-[10px] text-slate-400">{appUser?.email}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Filtros Atuais</p>
            <p className="text-slate-700 dark:text-slate-300 font-semibold truncate leading-relaxed">
              {filterBus ? `Ônibus: ${buses.find(b => b.id === filterBus)?.name}` : 'Todos os ônibus'}; <br />
              {filterCong ? `Cong: ${congregations.find(c => c.id === filterCong)?.name}` : 'Todas congregações'}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Base Legal de Passagens</p>
            <p className="text-slate-700 dark:text-slate-300 font-bold">{totalSeatsSold} poltronas reservadas</p>
            <p className="text-[10px] text-slate-400">Dos filtros aplicados</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Conformidade e Checagem</p>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 mt-0.5 rounded-full text-[9px] font-extrabold uppercase",
              adimplenciaRate === 100 
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border border-emerald-200" 
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 border border-amber-200"
            )}>
              {adimplenciaRate === 100 ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
              {adimplenciaRate === 100 ? "Lançamentos Quitados" : "Contém Saldos Pendentes"}
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* FILTERS (PRINT HIDDEN) */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-sm print:hidden">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-850 pb-2">
          <Filter size={13} className="text-slate-400" />
          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Filtros de Consolidação</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Name Search */}
          <div className="relative">
            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-mono">Busca por Passageiro</label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Nome ou observação..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm text-xs font-medium focus:outline-none focus:border-[#0067b8]"
              />
            </div>
          </div>

          {/* Bus Selection */}
          <div>
            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-mono">Filtrar por Veículo</label>
            <select
              value={filterBus}
              onChange={e => setFilterBus(e.target.value)}
              className="mt-1 w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm text-xs font-semibold focus:outline-none focus:border-[#0067b8]"
            >
              <option value="">(Todos os ônibus)</option>
              {buses.map(b => (
                <option key={b.id} value={b.id}>{b.name} - Cap. {b.capacity}</option>
              ))}
            </select>
          </div>

          {/* Congregation Selection */}
          {appUser?.role === UserRole.ADMIN && (
            <div>
              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-mono">Filtrar Congregação</label>
              <select
                value={filterCong}
                onChange={e => setFilterCong(e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm text-xs font-semibold focus:outline-none focus:border-[#0067b8]"
              >
                <option value="">(Todas as congregações)</option>
                {congregations.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Status Selection */}
          <div>
            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-mono">Situação Financeira</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="mt-1 w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm text-xs font-semibold focus:outline-none focus:border-[#0067b8]"
            >
              <option value="">(Qualquer situação)</option>
              <option value="PAGO">Somente Pago</option>
              <option value="PARCIAL">Somente Parcial</option>
              <option value="PENDENTE">Somente Inadimplente</option>
            </select>
          </div>

          {/* Payment Method Option */}
          <div>
            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1 font-mono">Forma de Entrada</label>
            <select
              value={filterPaymentMethod}
              onChange={e => setFilterPaymentMethod(e.target.value)}
              className="mt-1 w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-sm text-xs font-semibold focus:outline-none focus:border-[#0067b8]"
            >
              <option value="">(Todas as formas)</option>
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Transferência">Transferência</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* BALANCED AUDITING CARD GRID (LESS BRIGHT, MORE FORMAL) */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-sm flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] font-extrabold uppercase tracking-wider font-mono">Faturamento Esperado</span>
            <Layers size={14} className="text-slate-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs text-slate-400 mb-0.5 font-semibold">Valor Bruto Total</p>
            <p className="text-xl md:text-2xl font-mono font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalGross)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-sm flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] font-extrabold uppercase tracking-wider font-mono font-mono">Arrecadado Realizado</span>
            <DollarSign size={14} className="text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs text-slate-400 mb-0.5 font-semibold">Dinheiro Físico/Pix em Conta</p>
            <p className="text-xl md:text-2xl font-mono font-bold text-[#107c41] dark:text-emerald-400">{formatCurrency(totalCollected)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-sm flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] font-extrabold uppercase tracking-wider font-mono">Saldo Pendente</span>
            <AlertCircle size={14} className="text-rose-500" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs text-slate-400 mb-0.5 font-semibold">Valores a Coletar</p>
            <p className="text-xl md:text-2xl font-mono font-bold text-rose-600 dark:text-rose-450">{formatCurrency(totalPending)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-4 rounded-sm flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[9px] font-extrabold uppercase tracking-wider font-mono">Eficiência Financeira</span>
            <Percent size={14} className="text-[#0067b8]" />
          </div>
          <div className="mt-2.5">
            <p className="text-xs text-slate-400 mb-0.5 font-semibold">Percentual de Recebidos</p>
            <p className="text-xl md:text-2xl font-mono font-bold text-slate-850 dark:text-slate-100">
              {adimplenciaRate.toFixed(1)}%
            </p>
          </div>
        </div>

      </div>

      {/* ---------------------------------------------------- */}
      {/* DETAILED EXPENSE CALCULATOR & REPORT BALANCER */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-850 p-4 rounded-sm">
        <h3 className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-300 tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-1.5">
          <Wallet size={13} className="text-[#0067b8]" />
          Balancete Operacional (Fretamento vs. Receitas)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="print:hidden">
            <label className="text-[9px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono">1. Custo do Fretamento (R$)</label>
            <input
              type="number"
              value={charterExpense || ''}
              onChange={e => setCharterExpense(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="Ex: 2500"
              className="mt-1.5 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1 bg-transparent text-xs font-semibold focus:outline-none"
            />
          </div>
          <div className="hidden print:block pdf-show">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">1. Custo do Fretamento</label>
            <p className="mt-2 text-xs font-bold text-slate-800 font-mono">{formatCurrency(charterExpense)}</p>
          </div>
          
          <div className="print:hidden">
            <label className="text-[9px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider font-mono">2. Outras Despesas (Pedágio, taxas)</label>
            <input
              type="number"
              value={otherExpenses || ''}
              onChange={e => setOtherExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="Ex: 120"
              className="mt-1.5 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1 bg-transparent text-xs font-semibold focus:outline-none"
            />
          </div>
          <div className="hidden print:block pdf-show">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">2. Outras Despesas</label>
            <p className="mt-2 text-xs font-bold text-slate-800 font-mono">{formatCurrency(otherExpenses)}</p>
          </div>

          <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-2 bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-850 rounded-sm h-[48px] items-center">
            <div className="text-center border-r border-slate-100 dark:border-slate-800">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Total Coletado</span>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 font-mono">{formatCurrency(totalCollected)}</span>
            </div>
            <div className="text-center border-r border-slate-100 dark:border-slate-800">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Total de Despesas</span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-450 font-mono">{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="text-center">
              <span className="text-[8px] font-extrabold text-[#0067b8] dark:text-blue-400 uppercase tracking-wider block font-mono">Saldo Líquido</span>
              <span className={cn(
                "text-xs font-black font-mono",
                netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
              )}>
                {formatCurrency(netBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* AGGREGATED VIEWS (CONGREGATION / BUS / METHOD BREAKDOWNS) */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-sm">
        
        {/* Tab selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-905 px-4 pt-2 gap-2 print:hidden">
          <button
            onClick={() => setGroupingTab('congregation')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold transition-all rounded-t-sm border-t border-x cursor-pointer",
              groupingTab === 'congregation'
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-slate-200 dark:border-slate-850 text-[#0067b8]"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Building2 size={13} />
              Por Congregação ({congregationGrouped.length})
            </span>
          </button>

          <button
            onClick={() => setGroupingTab('bus')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold transition-all rounded-t-sm border-t border-x cursor-pointer",
              groupingTab === 'bus'
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-slate-200 dark:border-slate-850 text-[#0067b8]"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <span className="flex items-center gap-1.5">
              <BusIcon size={13} />
              Por Ônibus ({busGrouped.length})
            </span>
          </button>

          <button
            onClick={() => setGroupingTab('method')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold transition-all rounded-t-sm border-t border-x cursor-pointer",
              groupingTab === 'method'
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-slate-200 dark:border-slate-850"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Wallet size={13} />
              Forma de Caixa ({methodGrouped.length})
            </span>
          </button>
        </div>

        {/* Title for grouped summaries on Print */}
        <div className="hidden print:block p-4 border-b border-slate-200">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Demonstrativo e Resumos de Arrecadação por Grupos</p>
        </div>

        {/* Grouping Content Tables */}
        <div className="p-4">
          
          {/* Congregation view */}
          <div className={cn("space-y-2 print:mt-6 print:border-t print:pt-6", groupingTab === 'congregation' ? "block" : "hidden print:block pdf-show")}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Arrecadação por Grupo de Congregações</h4>
              <span className="text-[9px] font-mono text-slate-400 print:hidden">Consolidação por posto de coleta</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium text-slate-600 dark:text-slate-350 font-sans">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[9px] uppercase">
                    <th className="py-2">Congregação / Local</th>
                    <th className="py-2 text-center">Passageiros</th>
                    <th className="py-2 text-right">Faturamento Total</th>
                    <th className="py-2 text-right text-emerald-600 dark:text-emerald-400">Total Arrecadado</th>
                    <th className="py-2 text-right text-rose-500">Saldo Pendente</th>
                    <th className="py-2 text-center">% Adimplemento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  {congregationGrouped.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40">
                      <td className="py-2 font-sans font-bold text-slate-800 dark:text-slate-200">{item.name}</td>
                      <td className="py-2 text-center font-bold text-slate-500">{item.tickets}</td>
                      <td className="py-2 text-right">{formatCurrency(item.gross)}</td>
                      <td className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.paid)}</td>
                      <td className="py-2 text-right font-bold text-rose-500">{formatCurrency(item.pending)}</td>
                      <td className="py-2 text-center font-sans">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-sm font-black text-[9px]",
                          item.pct === 100 
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40" 
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40"
                        )}>
                          {item.pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {congregationGrouped.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400 italic">Sem registros para os filtros atuais.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bus view */}
          <div className={cn("space-y-2 print:mt-6 print:border-t print:pt-6", groupingTab === 'bus' ? "block" : "hidden print:block pdf-show")}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Desempenho Financeiro de Frota (Por Ônibus)</h4>
              <span className="text-[9px] font-mono text-slate-400 print:hidden">Taxa de preenchimento e faturamento</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium text-slate-600 dark:text-slate-350">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[9px] uppercase">
                    <th className="py-2">Identificação do Veículo</th>
                    <th className="py-2 text-center">Taxa de Assentos</th>
                    <th className="py-2 text-right">Faturamento Bruto</th>
                    <th className="py-2 text-right text-emerald-600 dark:text-emerald-400">Arrecadado</th>
                    <th className="py-2 text-right text-rose-500">Saldo</th>
                    <th className="py-2 text-center">Status Faturamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  {busGrouped.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40">
                      <td className="py-2 font-sans font-bold text-slate-800 dark:text-slate-200">
                        {item.name} <span className="text-[9px] text-slate-400 font-normal">#{item.number}</span>
                      </td>
                      <td className="py-2 text-center font-bold text-slate-500">
                        {item.tickets} / {item.capacity} <span className="text-[9px] text-slate-400">({((item.tickets / item.capacity) * 100).toFixed(0)}%)</span>
                      </td>
                      <td className="py-2 text-right">{formatCurrency(item.gross)}</td>
                      <td className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.paid)}</td>
                      <td className="py-2 text-right font-bold text-rose-500">{formatCurrency(item.pending)}</td>
                      <td className="py-2 text-center font-sans">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-sm font-black text-[9px]",
                          item.pct === 100 
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40" 
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40"
                        )}>
                          {item.pct.toFixed(0)}% Pago
                        </span>
                      </td>
                    </tr>
                  ))}
                  {busGrouped.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-400 italic">Sem registros de ônibus.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Method view */}
          <div className={cn("space-y-2 print:mt-6 print:border-t print:pt-6", groupingTab === 'method' ? "block" : "hidden print:block pdf-show")}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Entradas por Meio de Pagamento</h4>
              <span className="text-[9px] font-mono text-slate-400 print:hidden">Distribuição de forma financeira</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium text-slate-600 dark:text-slate-350">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[9px] uppercase">
                    <th className="py-2">Forma Escolhida</th>
                    <th className="py-2 text-center font-bold">Transações</th>
                    <th className="py-2 text-right">Faturamento Esperado</th>
                    <th className="py-2 text-right text-emerald-600 dark:text-emerald-400">Total Pago Recebido</th>
                    <th className="py-2 text-right text-rose-500">Pendente de Liquidação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                  {methodGrouped.map(item => (
                    <tr key={item.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40">
                      <td className="py-2 font-sans font-bold text-slate-800 dark:text-slate-200">{item.name}</td>
                      <td className="py-2 text-center font-bold text-slate-500">{item.tickets}</td>
                      <td className="py-2 text-right">{formatCurrency(item.gross)}</td>
                      <td className="py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.paid)}</td>
                      <td className="py-2 text-right font-bold text-rose-500">{formatCurrency(item.pending)}</td>
                    </tr>
                  ))}
                  {methodGrouped.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400 italic">Sem dados registrados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TRANSACTIONAL DETAILS LEDGER (AUDIT LAYOUT - MONO) */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-slate-400" />
            <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Extrato Detalhado de Reservas e Lançamentos
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold font-mono">
            {sortedFiltered.length} lançamentos encontrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-[9px] font-bold text-slate-400 uppercase font-mono tracking-wider">
                <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('name')}>
                  <span className="flex items-center gap-1">
                    Passageiro Responsável
                    {sortBy === 'name' && (sortOrder === 'asc' ? ' ▴' : ' ▾')}
                  </span>
                </th>
                <th className="px-4 py-3">Documento / RG</th>
                <th className="px-4 py-3">Ônibus Alocado</th>
                {appUser?.role === UserRole.ADMIN && (
                  <th className="px-4 py-3">Congregação</th>
                )}
                <th className="px-4 py-3">Forma</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort('value')}>
                  <span className="flex items-center justify-end gap-1">
                    Vlr Total
                    {sortBy === 'value' && (sortOrder === 'asc' ? ' ▴' : ' ▾')}
                  </span>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort('paid')}>
                  <span className="flex items-center justify-end gap-1">
                    Vlr Pago
                    {sortBy === 'paid' && (sortOrder === 'asc' ? ' ▴' : ' ▾')}
                  </span>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort('balance')}>
                  <span className="flex items-center justify-end gap-1">
                    Saldo
                    {sortBy === 'balance' && (sortOrder === 'asc' ? ' ▴' : ' ▾')}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              {sortedFiltered.map(res => (
                <tr key={res.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                  
                  {/* Passenger Name */}
                  <td className="px-4 py-2.5 font-sans font-bold text-slate-900 dark:text-white">
                    <div className="flex flex-col">
                      <span>{res.passengers?.[0]?.name || 'N/A'}</span>
                      {res.passengers && res.passengers.length > 1 && (
                        <span className="text-[10px] text-[#0067b8] dark:text-blue-400 font-bold mt-0.5 font-mono">
                          + {res.passengers.length - 1} passageiro(s) adicional(is)
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* Document */}
                  <td className="px-4 py-2.5 text-slate-500 font-semibold">{res.passengers?.[0]?.document || 'Não informado'}</td>
                  
                  {/* Bus */}
                  <td className="px-4 py-2.5 font-sans font-semibold text-slate-700 dark:text-slate-300">
                    {buses.find(b => b.id === res.busId)?.name || 'Sem ônibus'}
                  </td>
                  
                  {/* Congregation Admin only */}
                  {appUser?.role === UserRole.ADMIN && (
                    <td className="px-4 py-2.5 font-sans text-slate-600 dark:text-slate-400">
                      {congregations.find(c => c.id === res.congregationId)?.name || 'N/A'}
                    </td>
                  )}

                  {/* Payment Method */}
                  <td className="px-4 py-2.5 font-sans font-semibold text-slate-600 dark:text-slate-400 uppercase text-[10px]">
                    {res.paymentMethod || 'Pix'}
                  </td>

                  {/* Payment Status */}
                  <td className="px-4 py-2.5 text-center font-sans">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-sm font-bold text-[9px] uppercase tracking-tighter",
                      res.paymentStatus === PaymentStatus.PAGO 
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border border-emerald-200"
                        : res.paymentStatus === PaymentStatus.PARCIAL
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 border border-amber-200"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 border border-rose-250"
                    )}>
                      {res.paymentStatus}
                    </span>
                  </td>

                  {/* Numeric values */}
                  <td className="px-4 py-2.5 text-right font-bold text-slate-600 dark:text-slate-400">{formatCurrency(res.totalValue || 0)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(res.amountPaid || 0)}</td>
                  <td className={cn(
                    "px-4 py-2.5 text-right font-black",
                    res.balance > 0 ? "text-rose-650" : "text-slate-400 font-normal"
                  )}>
                    {formatCurrency(res.balance || 0)}
                  </td>

                </tr>
              ))}
              
              {sortedFiltered.length === 0 && (
                <tr>
                  <td colSpan={appUser?.role === UserRole.ADMIN ? 9 : 8} className="py-8 text-center text-slate-400 italic font-sans text-xs">
                    Nenhum lançamento corresponde aos filtros e buscas selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* AUDIT CLOSING AND SIGNATURE TERM (AUDITOR'S CORNER) */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-sm">
        <h4 className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-200 tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
          <FileCheck size={14} className="text-slate-500" />
          Ata de Auditoria, Conciliação e Assinatura do Fechamento
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              O preenchimento deste termo serve para formalizar a entrega de contas físicas e depósitos perante o tesoureiro responsável.
              Escreva quaisquer anotações de auditoria no campo abaixo (ex: descontos de taxas Pix, envelopes físicos de dinheiro pendentes, depósitos identificados por extratos do banco).
            </p>

            <div className="space-y-1.5 font-medium">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Notas de Conferência do Caixa</label>
              <textarea
                value={auditNotes}
                onChange={e => setAuditNotes(e.target.value)}
                placeholder="Insira notas de rodapé do balanço (Ex: Coleta do Pix realizada integralmente pela congregação X e depositado no Banco Y em 05/06...)"
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none rounded-xs font-sans print:hidden pdf-hide"
              />
              <div className="hidden print:block pdf-show p-2.5 min-h-[80px] bg-slate-50/50 dark:bg-slate-950/25 border border-slate-200 dark:border-slate-800 text-xs font-sans whitespace-pre-wrap text-slate-800 dark:text-slate-100 rounded-sm">
                {auditNotes || "Nenhuma observação inserida para este fechamento de caixa."}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 print:hidden">
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Assinante / Conferidor</label>
                <input
                  type="text"
                  value={signeeName}
                  onChange={e => setSigneeName(e.target.value)}
                  placeholder="Nome do Auditor"
                  className="mt-1.5 w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-semibold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Cargo / Atribuição</label>
                <input
                  type="text"
                  value={signeeRole}
                  onChange={e => setSigneeRole(e.target.value)}
                  placeholder="Cargo Financeiro"
                  className="mt-1.5 w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            {/* Print Signatures Block */}
            <div className="border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/20 dark:bg-slate-950/10 space-y-4 rounded-sm">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Validação Eletrônica / de Impressão</h5>
              <div className="grid grid-cols-2 gap-4 text-center text-[10px] text-slate-500 pt-3">
                <div className="border-t border-slate-350 dark:border-slate-850 pt-2.5 font-sans">
                  <p className="font-extrabold text-slate-700 dark:text-slate-300">{signeeName || '___________________________'}</p>
                  <p className="mt-0.5">{signeeRole || 'Responsável Financeiro'}</p>
                  <p className="text-[9px] text-slate-400 mt-1">Declaro conformidade física e digital</p>
                </div>
                <div className="border-t border-slate-350 dark:border-slate-850 pt-2.5 font-sans">
                  <p className="font-extrabold text-slate-700 dark:text-slate-300">___________________________</p>
                  <p className="mt-0.5">Visto do Coordenador Geral</p>
                  <p className="text-[9px] text-slate-400 mt-1">Homologado após cruzamento bancário</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* IFRAME PRINT INSTRUCTIONS MODAL */}
      {/* ---------------------------------------------------- */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden animate-fade-in">
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
                Para obter seu demonstrativo financeiro completo, escolha:
              </p>
              <ul className="list-decimal list-inside space-y-1.5 pl-1 font-medium">
                <li>
                  <span className="text-slate-800 dark:text-white font-bold">Salvar PDF Direto</span>: Gera instantaneamente o arquivo PDF ajustado para desktop com todas as colunas visíveis.
                </li>
                <li>
                  <span className="text-slate-800 dark:text-white font-bold">Abrir e Imprimir</span>: Abre o demonstrativo em uma nova guia exclusiva de tela inteira, onde a ferramenta de impressão original do navegador é disparada instantaneamente sem bloqueios.
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm cursor-pointer"
              >
                Fechar
              </button>
              
              <button
                onClick={async () => {
                  setShowPrintModal(false);
                  await handleExportPDF();
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 rounded-sm flex items-center justify-center gap-1.5 cursor-pointer border border-transparent"
              >
                <Download size={14} />
                <span>Salvar PDF Direto</span>
              </button>

              <a
                href={`${window.location.origin}${window.location.pathname}?tab=reports&print=true`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#0067b8] hover:bg-[#005da6] rounded-sm flex items-center justify-center gap-1.5 text-center cursor-pointer shadow-xs font-bold"
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
};

export default ReportsView;
