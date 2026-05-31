import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  User as UserIcon, 
  Bus as BusIcon, 
  MapPin, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  X,
  CreditCard,
  DollarSign,
  Printer,
  Share2,
  ChevronDown
} from 'lucide-react';
import { db, createAuditLog, createNotification } from '../services/firebase';
import { Reservation, PaymentStatus, Bus, Congregation, UserRole, LogAction, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatCurrency } from '../lib/utils';

const RegistriesView: React.FC = () => {
  const { appUser } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBus, setFilterBus] = useState('');
  const [filterCong, setFilterCong] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showReceipt, setShowReceipt] = useState<Reservation | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Partial Payment Modal State
  const [editRes, setEditRes] = useState<Reservation | null>(null);
  const [newAmount, setNewAmount] = useState<number>(0);
  const [updating, setUpdating] = useState(false);
  const [editDays, setEditDays] = useState<string[]>([]);

  // Receipt State
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Global Prices State for Sync/Recalculation
  const [globalPrice, setGlobalPrice] = useState(0);
  const [dailyPrices, setDailyPrices] = useState<{ [day: string]: number }>({
    'Sexta': 42,
    'Sábado': 36,
    'Domingo': 36
  });
  const [isRecalculatingAll, setIsRecalculatingAll] = useState(false);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const base = data.ticketPrice || 0;
        setGlobalPrice(base);
        if (data.dailyPrices) {
          setDailyPrices(data.dailyPrices);
        } else {
          setDailyPrices({
            'Sexta': base || 42,
            'Sábado': base || 36,
            'Domingo': base || 36
          });
        }
      }
    });
    return unsubSettings;
  }, []);

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
      // Sort in-memory client-side by createdAt descending to avoid composite index requirements
      data.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setReservations(data);
    }, (error) => {
      console.error("Error loading reservations:", error);
    });
    const unsubB = onSnapshot(collection(db, 'buses'), (snap) => {
      setBuses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus)));
    });
    const unsubC = onSnapshot(collection(db, 'congregations'), (snap) => {
      setCongregations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Congregation)));
    });
    return () => { unsubRes(); unsubB(); unsubC(); };
  }, [appUser]);

  const filteredReservations = reservations.filter(res => {
    const passengersText = res.passengers?.map(p => p.name + p.document).join(' ').toLowerCase() || '';
    const matchesSearch = passengersText.includes(searchTerm.toLowerCase());
    const matchesBus = filterBus ? res.busId === filterBus : true;
    const matchesCong = filterCong ? res.congregationId === filterCong : true;
    const matchesStatus = filterStatus ? res.paymentStatus === filterStatus : true;
    return matchesSearch && matchesBus && matchesCong && matchesStatus;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = reservations.find(r => r.id === deleteId);
    await deleteDoc(doc(db, 'reservations', deleteId));
    if (res) {
      await createAuditLog(
        LogAction.RESERVATION_DELETE,
        `Reserva eliminada: ${res.passengers?.[0]?.name || 'N/A'} (+${(res.passengers?.length || 1) - 1})`,
        deleteId
      );

      // Notify about deletion
      await createNotification({
        title: 'Reserva Excluída',
        message: `A reserva de ${res.passengers?.[0]?.name || 'Passageiro'} foi removida do sistema. Vagas liberadas.`,
        type: NotificationType.RESERVATION_DELETE,
        targetRoles: [UserRole.ADMIN, UserRole.COORDINATOR],
        congregationId: res.congregationId,
        link: 'reservations'
      });
    }
    setDeleteId(null);
  };

  const getExpectedTotalValue = (res: Reservation) => {
    const pCount = res.passengers?.length || 1;
    const days = res.days || [];
    return pCount * days.reduce((sum, day) => {
      const price = dailyPrices[day] !== undefined ? dailyPrices[day] : globalPrice;
      return sum + price;
    }, 0);
  };

  const mismatchedReservations = reservations.filter(res => {
    const expected = getExpectedTotalValue(res);
    return res.totalValue !== expected;
  });

  const handleRecalculateAll = async () => {
    if (isRecalculatingAll) return;
    if (!window.confirm(`Deseja atualizar automaticamente as ${mismatchedReservations.length} reservas desatualizadas para os novos valores de passagem do congresso? Isso recalculará o Valor Total, novo Saldo Restante e redefinirá o Status de Pagamento (Pago, Parcial ou Pendente) com base no que já foi pago.`)) {
      return;
    }
    
    setIsRecalculatingAll(true);
    try {
      let count = 0;
      for (const res of mismatchedReservations) {
        const expectedTotal = getExpectedTotalValue(res);
        const newBalance = Math.max(0, expectedTotal - res.amountPaid);
        const isPaid = res.amountPaid >= expectedTotal;
        const isPartial = res.amountPaid > 0 && res.amountPaid < expectedTotal;
        const status = isPaid ? PaymentStatus.PAGO : (isPartial ? PaymentStatus.PARCIAL : PaymentStatus.PENDENTE);
        
        await updateDoc(doc(db, 'reservations', res.id), {
          totalValue: expectedTotal,
          balance: newBalance,
          paymentStatus: status,
          dailyPrices: dailyPrices,
          unitValue: globalPrice
        });
        
        await createAuditLog(
          LogAction.PAYMENT_UPDATE,
          `Recalculado automático por alteração tarifária global. Novo valor total: R$ ${expectedTotal}. Pago: R$ ${res.amountPaid}. Novo saldo: R$ ${newBalance}`,
          res.id
        );
        count++;
      }
      
      await createNotification({
        title: 'Recálculo em Massa Concluído',
        message: `${count} reservas foram sincronizadas com os novos valores tarifários com sucesso.`,
        type: NotificationType.RESERVATION_NEW,
        targetRoles: [UserRole.ADMIN, UserRole.COORDINATOR],
        link: 'reservations'
      });
      alert(`${count} reservas foram recalculadas com sucesso para os novos valores!`);
    } catch (error) {
      console.error('Error during batch recalculation:', error);
      alert('Erro ao tentar atualizar as reservas. Verifique o console.');
    } finally {
      setIsRecalculatingAll(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!editRes) return;
    if (editDays.length === 0) {
      alert('Selecione pelo menos um dia de viagem.');
      return;
    }
    setUpdating(true);
    try {
      const modalPassengersCount = editRes.passengers?.length || 1;
      const computedTotalValue = modalPassengersCount * editDays.reduce((sum, day) => {
        const price = dailyPrices[day] !== undefined ? dailyPrices[day] : globalPrice;
        return sum + price;
      }, 0);
      const updatedAmount = editRes.amountPaid + newAmount;
      const isPaid = updatedAmount >= computedTotalValue;
      const isPartial = updatedAmount > 0 && updatedAmount < computedTotalValue;
      const status = isPaid ? PaymentStatus.PAGO : (isPartial ? PaymentStatus.PARCIAL : PaymentStatus.PENDENTE);
      const newBalance = Math.max(0, computedTotalValue - updatedAmount);

      await updateDoc(doc(db, 'reservations', editRes.id), {
        days: editDays,
        totalValue: computedTotalValue,
        amountPaid: updatedAmount,
        balance: newBalance,
        paymentStatus: status,
        dailyPrices,
        unitValue: globalPrice
      });
      
      await createAuditLog(
        LogAction.PAYMENT_UPDATE,
        `Reserva/Pagamento atualizado. Dias: ${editDays.join(', ')}. Valor Total: R$ ${computedTotalValue}. Pago: R$ ${updatedAmount}. Novo saldo: R$ ${newBalance}`,
        editRes.id
      );

      // Notify about payment update
      await createNotification({
        title: 'Reserva/Pagamento Atualizado',
        message: `Reserva de ${editRes.passengers?.[0]?.name} atualizada. Dias: ${editDays.join(', ')}. Total: ${formatCurrency(computedTotalValue)}. Pago: ${formatCurrency(updatedAmount)}. Saldo: ${formatCurrency(newBalance)}`,
        type: NotificationType.RESERVATION_NEW,
        targetRoles: [UserRole.ADMIN, UserRole.COORDINATOR],
        congregationId: editRes.congregationId,
        link: 'reservations'
      });

      setEditRes(null);
      setNewAmount(0);
      setEditDays([]);
    } catch (error) {
      console.error('Error updating reservation & payment:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleShareReceipt = async () => {
    if (!showReceipt) return;
    setIsGeneratingPDF(true);
    
    try {
      const element = document.getElementById('receipt-downloadable');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      
      const blob = pdf.output('blob');
      const file = new File([blob], `Recibo_${showReceipt.passengers?.[0]?.name}.pdf`, { type: 'application/pdf' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'Recibo de Passagem',
          text: `Recibo de passagem - ${showReceipt.passengers?.[0]?.name}`
        });
      } else {
        pdf.save(`Recibo_${showReceipt.passengers?.[0]?.name}.pdf`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAGO: return "bg-emerald-600 text-white shadow-emerald-200/50";
      case PaymentStatus.PARCIAL: return "bg-orange-500 text-white shadow-orange-200/50";
      default: return "bg-slate-300 text-slate-800 shadow-slate-100";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#1b1b1b] dark:text-white tracking-tight mb-1">Registros</h1>
          <p className="text-sm text-[#707070] dark:text-slate-400">Banco de dados operacional e financeiro</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-600 dark:border-slate-700 rounded-sm text-sm outline-none focus:border-[#0067b8] dark:focus:border-blue-500 dark:text-white transition-colors"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={cn("p-2.5 rounded-sm transition-all border-2", showFilters ? "bg-slate-900 border-slate-900 text-white" : "bg-white dark:bg-slate-900 border-slate-600 dark:border-slate-700 text-[#707070] dark:text-slate-400 hover:bg-[#f3f3f3] dark:hover:bg-slate-800")}>
            <Filter size={18} />
          </button>
        </div>
      </div>

      {(appUser?.role === UserRole.ADMIN || appUser?.role === UserRole.COORDINATOR) && mismatchedReservations.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Preços Desatualizados nas Reservas</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-medium leading-relaxed">
                Detectamos <strong>{mismatchedReservations.length}</strong> {mismatchedReservations.length === 1 ? 'reserva antiga que não está' : 'reservas antigas que não estão'} calculadas com os novos preços de passagens (Sexta: {formatCurrency(dailyPrices['Sexta'])}, Sábado: {formatCurrency(dailyPrices['Sábado'])}, Domingo: {formatCurrency(dailyPrices['Domingo'])}).
              </p>
            </div>
          </div>
          <button
            onClick={handleRecalculateAll}
            disabled={isRecalculatingAll}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 font-sans cursor-pointer"
          >
            {isRecalculatingAll ? (
              <>
                <Clock className="animate-spin" size={14} />
                <span>Atualizando...</span>
              </>
            ) : (
              <span>Corrigir / Recalcular Todas</span>
            )}
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-8">
            <div className="ms-card p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#707070] dark:text-slate-400">Ônibus</label>
                <select className="w-full p-2.5 bg-white dark:bg-slate-800 border-2 border-slate-600 dark:border-slate-700 rounded-sm text-sm outline-none focus:border-[#0067b8] dark:focus:border-blue-500 dark:text-white" value={filterBus} onChange={e => setFilterBus(e.target.value)}>
                  <option value="">Todos Ônibus</option>
                  {buses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              {appUser?.role === UserRole.ADMIN && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#707070] dark:text-slate-400">Congregação</label>
                  <select className="w-full p-2.5 bg-white dark:bg-slate-800 border-2 border-slate-600 dark:border-slate-700 rounded-sm text-sm outline-none focus:border-[#0067b8] dark:focus:border-blue-500 dark:text-white" value={filterCong} onChange={e => setFilterCong(e.target.value)}>
                    <option value="">Todas Congregações</option>
                    {congregations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#707070] dark:text-slate-400">Pagamento</label>
                <select className="w-full p-2.5 bg-white dark:bg-slate-800 border-2 border-slate-600 dark:border-slate-700 rounded-sm text-sm outline-none focus:border-[#0067b8] dark:focus:border-blue-500 dark:text-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">Status Pagamento</option>
                  <option value={PaymentStatus.PAGO}>Pago</option>
                  <option value={PaymentStatus.PARCIAL}>Parcial</option>
                  <option value={PaymentStatus.PENDENTE}>Pendente</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="ms-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-[#f2f2f2] dark:border-slate-800 bg-[#fafafa] dark:bg-slate-900/50 transition-colors">
                <th className="px-6 py-4 text-xs font-semibold text-[#707070] dark:text-slate-400">Passageiro</th>
                <th className="px-4 py-4 text-xs font-semibold text-[#707070] dark:text-slate-400">Logística</th>
                <th className="px-4 py-4 text-xs font-semibold text-[#707070] dark:text-slate-400 text-center">Dias</th>
                <th className="px-4 py-4 text-xs font-semibold text-[#707070] dark:text-slate-400 text-right">Financeiro</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#707070] dark:text-slate-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f2f2] dark:divide-slate-800">
              {filteredReservations.map((res) => (
                <motion.tr 
                  layout 
                  key={res.id} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-[#fcfcfc] dark:hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center font-bold text-xs",
                        res.paymentStatus === PaymentStatus.PAGO ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" : 
                        res.paymentStatus === PaymentStatus.PARCIAL ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400" :
                        "bg-[#f2f2f2] dark:bg-slate-800 text-[#707070] dark:text-slate-400"
                      )}>
                        {res.passengers?.length || 1}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#1b1b1b] dark:text-white leading-tight truncate">
                          {res.passengers?.[0]?.name || 'Sem nome'}
                        </h3>
                        {res.passengers?.length > 1 && (
                          <p className="text-[10px] text-[#707070] dark:text-slate-500 font-medium">+{res.passengers.length - 1} dependentes</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[#707070] dark:text-slate-400">
                        <BusIcon size={12} />
                        <span className="text-[11px] font-medium truncate uppercase tracking-tight">
                          {buses.find(b => b.id === res.busId)?.name || '---'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#707070] dark:text-slate-400">
                        <MapPin size={12} />
                        <span className="text-[11px] font-medium truncate uppercase tracking-tight">
                          {congregations.find(c => c.id === res.congregationId)?.name || '---'}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-5 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {res.days?.map(day => (
                        <span key={day} className="px-1.5 py-0.5 rounded-sm bg-[#f2f2f2] dark:bg-slate-800 text-[#707070] dark:text-slate-400 text-[10px] font-semibold">
                          {day.substring(0, 3)}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-5 text-right">
                    <div className="inline-block text-right">
                      <p className="text-sm font-bold text-[#1b1b1b] dark:text-white">{formatCurrency(res.totalValue)}</p>
                      <p className={cn("text-[10px] font-semibold mt-0.5", res.balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                        {res.balance > 0 ? `Deve ${formatCurrency(res.balance)}` : 'Pago'}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setShowReceipt(res); setReceivedAmount(res.receivedAmount || res.totalValue); }} className="p-2 text-[#707070] dark:text-slate-400 hover:text-[#0067b8] dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 rounded-sm transition-all"><Printer size={16} /></button>
                      <button onClick={() => { setEditRes(res); setNewAmount(0); setEditDays(res.days || []); }} className="p-2 text-[#707070] dark:text-slate-400 hover:text-[#0067b8] dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 rounded-sm transition-all" title="Editar dias e pagamento"><CreditCard size={16} /></button>
                      <button onClick={() => setDeleteId(res.id)} className="p-2 text-[#707070] dark:text-slate-400 hover:text-[#e81123] dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-sm transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        {filteredReservations.length === 0 && (
          <div className="py-24 text-center">
            <Users size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
            <p className="text-slate-400 dark:text-slate-600 font-black uppercase tracking-widest text-xs">Nenhum registro encontrado</p>
          </div>
        )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)} className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl text-center border border-black/5 dark:border-white/5">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/30 rounded-3xl flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto mb-8 transition-colors"><AlertCircle size={40} /></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Excluir Registro?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 text-sm">Esta ação é irreversível e as vagas serão liberadas no ônibus.</p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">Manter</button>
                <button onClick={handleDelete} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 dark:shadow-none">Excluir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Update Payment Modal */}
      <AnimatePresence>
        {editRes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditRes(null)} className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-black/5 dark:border-white/5 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Editar Reserva</h3>
                  <p className="text-xs font-bold text-[#707070] dark:text-slate-400 mt-1 uppercase tracking-tight">
                    {editRes.passengers?.[0]?.name} {editRes.passengers && editRes.passengers.length > 1 && `(+${editRes.passengers.length - 1} dependentes)`}
                  </p>
                </div>
                <button onClick={() => setEditRes(null)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 transition-colors"><X size={24} /></button>
              </div>
              
              <div className="space-y-6">
                {/* Travel Days Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Dias de Viagem</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Sexta', 'Sábado', 'Domingo'].map((day) => {
                      const isSelected = editDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setEditDays(editDays.filter(d => d !== day));
                            } else {
                              setEditDays([...editDays, day]);
                            }
                          }}
                          className={cn(
                            "py-3 rounded-xl border-2 font-bold text-xs transition-colors uppercase tracking-wider",
                            isSelected
                              ? "bg-slate-900 dark:bg-blue-600 border-slate-900 dark:border-blue-600 text-white"
                              : "bg-[#f2f2f2] dark:bg-slate-800/50 border-transparent text-[#707070] dark:text-slate-400 hover:bg-[#eaeaea] dark:hover:bg-slate-800"
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Calculation Summary */}
                {(() => {
                  const modalPassengersCount = editRes.passengers?.length || 1;
                  const computedTotalValue = modalPassengersCount * editDays.reduce((sum, day) => {
                    const price = dailyPrices[day] !== undefined ? dailyPrices[day] : globalPrice;
                    return sum + price;
                  }, 0);
                  const computedBalance = Math.max(0, computedTotalValue - (editRes.amountPaid + newAmount));
                  return (
                    <>
                      <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Resumo da Conta</p>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Valor Total</span>
                          <span className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(computedTotalValue)}</span>
                        </div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Já Pago</span>
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(editRes.amountPaid)}</span>
                        </div>
                        {newAmount > 0 && (
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Novo Pagamento</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">+{formatCurrency(newAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-end pt-3 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-300">Saldo Restante</span>
                          <span className="text-2xl font-black text-rose-500 dark:text-rose-400">{formatCurrency(computedBalance)}</span>
                        </div>
                      </div>

                      {/* Add Extra Value */}
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Registrar Pagamento (R$)</label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black font-sans text-xl">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            className="w-full pl-14 pr-5 py-5 bg-white dark:bg-slate-950 border-2 border-slate-600 dark:border-slate-800 rounded-2xl outline-none text-2xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-blue-500 transition-all shadow-inner"
                            value={newAmount === 0 ? '' : newAmount}
                            onChange={(e) => setNewAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </>
                  );
                })()}

                <button
                  onClick={handleUpdatePayment}
                  disabled={updating || editDays.length === 0}
                  className="w-full py-5 bg-slate-900 dark:bg-blue-600 text-white rounded-3xl font-black text-lg hover:bg-[#000000] dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl dark:shadow-none disabled:opacity-50"
                >
                  {updating ? <Clock className="animate-spin" size={20} /> : 'Salvar Alterações'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setShowReceipt(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-[400px] rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto border border-black/5 dark:border-white/5"
            >
              {/* Modal UI (Not the PDF Content) */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 transition-colors">
                <h3 className="font-black text-slate-900 dark:text-white">Visualizar Recibo</h3>
                <button onClick={() => setShowReceipt(null)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500"><X size={20} /></button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
                {/* Inputs for calculation within modal */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Valor Recebido (Troco)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-sans text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-blue-500 transition-colors shadow-sm"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Troco:</span>
                    <span className="font-black text-slate-900 dark:text-white text-lg">
                      {formatCurrency(Math.max(0, receivedAmount - showReceipt.totalValue))}
                    </span>
                  </div>
                </div>

                {/* PDF PREVIEW ZONE - Light for print clarity */}
                <div className="bg-white border rounded-lg shadow-sm overflow-hidden transform scale-95 origin-top">
                  <div id="receipt-downloadable" className="p-8 bg-[#ffffff] text-[#1a1a1a] font-serif w-[350px] mx-auto min-h-[450px] space-y-6">
                    <div className="text-center border-b-2 border-[#1a1a1a] pb-2">
                      <h4 className="text-xl font-black uppercase tracking-widest text-[#1a1a1a]">Recibo</h4>
                    </div>

                    <div className="flex justify-between items-center border-b-2 border-[#1a1a1a] pb-4">
                      <div className="text-left font-black text-xs uppercase tracking-widest text-[#1a1a1a]">
                        Documento Digital
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#1a1a1a]">Data: <span className="font-normal underline underline-offset-4">{showReceipt.createdAt?.toDate().toLocaleDateString('pt-BR')}</span></p>
                      </div>
                    </div>

                    <div className="space-y-6 py-4">
                      <div className="flex flex-col border-b border-[#dddddd] pb-2">
                        <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider">Comprador</span>
                        <span className="text-lg font-bold text-[#1a1a1a]">{showReceipt.passengers?.[0]?.name}</span>
                        {showReceipt.passengers && showReceipt.passengers.length > 1 && (
                          <span className="text-[10px] text-[#555555] mt-1 font-sans">
                            Dependentes: {showReceipt.passengers.slice(1).map(p => p.name).join(', ')}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col border-b border-[#dddddd] pb-2">
                          <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider">Qtd. Passageiros</span>
                          <span className="text-lg font-bold text-[#1a1a1a]">{showReceipt.passengers?.length || 1} p.</span>
                        </div>
                        <div className="flex flex-col border-b border-[#dddddd] pb-2 text-right">
                          <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider">Ônibus / Vaga</span>
                          <span className="text-sm font-bold text-[#1a1a1a]">{buses.find(b => b.id === showReceipt.busId)?.name}</span>
                        </div>
                        <div className="flex flex-col border-b border-[#dddddd] pb-2 col-span-2">
                          <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider">Dias Marcados</span>
                          <span className="text-sm font-bold text-[#1a1a1a]">{showReceipt.days?.join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 py-6 bg-[#fafafa] rounded-xl px-6 border border-[#eeeeee]">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-[#999999] uppercase">Valor Total:</p>
                        <p className="text-xl font-black text-[#1a1a1a]">{formatCurrency(showReceipt.totalValue)}</p>
                      </div>
                      <div className="space-y-1 text-right border-l border-[#dddddd] pl-6">
                        <p className="text-[10px] font-bold text-[#999999] uppercase">Valor Recebido:</p>
                        <p className="text-xl font-black text-[#1a1a1a]">{formatCurrency(receivedAmount)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-4 px-6 bg-[#f0fdf4] rounded-xl border border-[#dcfce7]">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#15803d]">Troco a Devolver:</span>
                      <span className="text-2xl font-black text-[#15803d]">{formatCurrency(Math.max(0, receivedAmount - showReceipt.totalValue))}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xl font-black uppercase border-t-4 border-[#1a1a1a] pt-4 text-[#1a1a1a]">
                        <span>Total:</span>
                        <span>{formatCurrency(showReceipt.totalValue)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-12 text-center text-[#1a1a1a]">
                      <div className="border-t border-[#1a1a1a] pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-tighter">({appUser?.name || 'Vendedor'})</p>
                        <p className="text-[8px] text-[#999999]">Recibo gerado digitalmente</p>
                      </div>
                      <div className="border-t border-[#1a1a1a] pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-tighter">(Conferido por)</p>
                      </div>
                    </div>
                    
                    <div className="text-[8px] text-[#cccccc] pt-4 flex justify-between">
                      <span>S-24-T 05/21 MOD</span>
                      <span>ID: {showReceipt.id.substring(0, 8)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 sticky bottom-0 bg-slate-50 dark:bg-slate-950 pt-4 transition-colors">
                  <button
                    onClick={handleShareReceipt}
                    disabled={isGeneratingPDF}
                    className="flex-1 py-4 bg-indigo-600 dark:bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50"
                  >
                    {isGeneratingPDF ? (
                      <Clock className="animate-spin" size={16} />
                    ) : (
                      <Share2 size={16} />
                    )}
                    {isGeneratingPDF ? 'Gerando...' : 'Compartilhar PDF'}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-100 dark:shadow-none"
                  >
                    <Printer size={16} />
                    Imprimir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RegistriesView;

