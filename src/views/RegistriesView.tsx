import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
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
  Printer
} from 'lucide-react';
import { db, createAuditLog } from '../services/firebase';
import { Reservation, PaymentStatus, Bus, Congregation, UserRole, LogAction } from '../types';
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

  useEffect(() => {
    if (!appUser) return;
    let resQuery = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
    if (appUser.role === UserRole.COORDINATOR && appUser.congregationId) {
      resQuery = query(resQuery, where('congregationId', '==', appUser.congregationId));
    } else if (appUser.role === UserRole.USER) {
      resQuery = query(resQuery, where('createdBy', '==', appUser.uid));
    }

    const unsubRes = onSnapshot(resQuery, (snap) => {
      setReservations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));
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
    }
    setDeleteId(null);
  };

  const handleUpdatePayment = async () => {
    if (!editRes) return;
    setUpdating(true);
    try {
      const updatedAmount = editRes.amountPaid + newAmount;
      const isPaid = updatedAmount >= editRes.totalValue;
      const isPartial = updatedAmount > 0 && updatedAmount < editRes.totalValue;
      const status = isPaid ? PaymentStatus.PAGO : (isPartial ? PaymentStatus.PARCIAL : PaymentStatus.PENDENTE);

      await updateDoc(doc(db, 'reservations', editRes.id), {
        amountPaid: updatedAmount,
        balance: Math.max(0, editRes.totalValue - updatedAmount),
        paymentStatus: status
      });
      
      await createAuditLog(
        LogAction.PAYMENT_UPDATE,
        `Pagamento atualizado em R$ ${newAmount}. Novo saldo: R$ ${Math.max(0, editRes.totalValue - updatedAmount)}`,
        editRes.id
      );

      setEditRes(null);
      setNewAmount(0);
    } catch (error) {
      console.error('Error updating payment:', error);
    } finally {
      setUpdating(false);
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
          <h1 className="text-3xl font-semibold text-[#1b1b1b] tracking-tight mb-1">Registros</h1>
          <p className="text-sm text-[#707070]">Banco de dados operacional e financeiro</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-slate-600 rounded-sm text-sm outline-none focus:border-[#0067b8]"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={cn("p-2.5 rounded-sm transition-all border-2", showFilters ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-600 text-[#707070] hover:bg-[#f3f3f3]")}>
            <Filter size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-8">
            <div className="ms-card p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#707070]">Ônibus</label>
                <select className="w-full p-2.5 bg-white border-2 border-slate-600 rounded-sm text-sm outline-none focus:border-[#0067b8]" value={filterBus} onChange={e => setFilterBus(e.target.value)}>
                  <option value="">Todos Ônibus</option>
                  {buses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              {appUser?.role === UserRole.ADMIN && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#707070]">Congregação</label>
                  <select className="w-full p-2.5 bg-white border-2 border-slate-600 rounded-sm text-sm outline-none focus:border-[#0067b8]" value={filterCong} onChange={e => setFilterCong(e.target.value)}>
                    <option value="">Todas Congregações</option>
                    {congregations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#707070]">Pagamento</label>
                <select className="w-full p-2.5 bg-white border-2 border-slate-600 rounded-sm text-sm outline-none focus:border-[#0067b8]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
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
              <tr className="border-b border-[#f2f2f2] bg-[#fafafa]">
                <th className="px-6 py-4 text-xs font-semibold text-[#707070]">Passageiro</th>
                <th className="px-4 py-4 text-xs font-semibold text-[#707070]">Logística</th>
                <th className="px-4 py-4 text-xs font-semibold text-[#707070] text-center">Dias</th>
                <th className="px-4 py-4 text-xs font-semibold text-[#707070] text-right">Financeiro</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#707070] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f2f2]">
              {filteredReservations.map((res) => (
                <motion.tr 
                  layout 
                  key={res.id} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-[#fcfcfc] transition-colors group"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-sm flex-shrink-0 flex items-center justify-center font-bold text-xs",
                        res.paymentStatus === PaymentStatus.PAGO ? "bg-emerald-50 text-emerald-600" : 
                        res.paymentStatus === PaymentStatus.PARCIAL ? "bg-orange-50 text-orange-600" :
                        "bg-[#f2f2f2] text-[#707070]"
                      )}>
                        {res.passengers?.length || 1}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#1b1b1b] leading-tight truncate">
                          {res.passengers?.[0]?.name || 'Sem nome'}
                        </h3>
                        {res.passengers?.length > 1 && (
                          <p className="text-[10px] text-[#707070] font-medium">+{res.passengers.length - 1} dependentes</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[#707070]">
                        <BusIcon size={12} />
                        <span className="text-[11px] font-medium truncate uppercase tracking-tight">
                          {buses.find(b => b.id === res.busId)?.name || '---'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#707070]">
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
                        <span key={day} className="px-1.5 py-0.5 rounded-sm bg-[#f2f2f2] text-[#707070] text-[10px] font-semibold">
                          {day.substring(0, 3)}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-5 text-right">
                    <div className="inline-block text-right">
                      <p className="text-sm font-bold text-[#1b1b1b]">{formatCurrency(res.totalValue)}</p>
                      <p className={cn("text-[10px] font-semibold mt-0.5", res.balance > 0 ? "text-rose-600" : "text-emerald-600")}>
                        {res.balance > 0 ? `Deve ${formatCurrency(res.balance)}` : 'Pago'}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setShowReceipt(res)} className="p-2 text-[#707070] hover:text-[#0067b8] hover:bg-white rounded-sm transition-all"><Printer size={16} /></button>
                      <button onClick={() => { setEditRes(res); setNewAmount(0); }} className="p-2 text-[#707070] hover:text-[#0067b8] hover:bg-white rounded-sm transition-all"><CreditCard size={16} /></button>
                      <button onClick={() => setDeleteId(res.id)} className="p-2 text-[#707070] hover:text-[#e81123] hover:bg-red-50 rounded-sm transition-all"><Trash2 size={16} /></button>
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
            <Users size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Nenhum registro encontrado</p>
          </div>
        )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteId(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl text-center">
              <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-8"><AlertCircle size={40} /></div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Excluir Registro?</h3>
              <p className="text-slate-500 font-medium mb-10">Esta ação é irreversível e as vagas serão liberadas no ônibus.</p>
              <div className="flex gap-4">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all">Manter</button>
                <button onClick={handleDelete} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold hover:bg-rose-600 transition-all">Excluir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Update Payment Modal */}
      <AnimatePresence>
        {editRes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditRes(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-slate-900">Pagamento</h3>
                <button onClick={() => setEditRes(null)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><X size={24} /></button>
              </div>
              
              <div className="space-y-6">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resumo da Conta</p>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-slate-500">Valor Total</span>
                    <span className="text-xl font-black text-slate-900">{formatCurrency(editRes.totalValue)}</span>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-slate-500">Já Pago</span>
                    <span className="text-lg font-bold text-emerald-600">{formatCurrency(editRes.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between items-end pt-3 border-t border-slate-200">
                    <span className="text-sm font-bold text-slate-900">Saldo Restante</span>
                    <span className="text-2xl font-black text-rose-500">{formatCurrency(editRes.balance)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Acrescentar Valor (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="w-full pl-14 pr-5 py-5 bg-white border-2 border-slate-600 rounded-2xl outline-none text-2xl font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                      value={newAmount === 0 ? '' : newAmount}
                      onChange={(e) => setNewAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  onClick={handleUpdatePayment}
                  disabled={updating || newAmount <= 0}
                  className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
                >
                  {updating ? 'Processando...' : 'Confirmar Pagamento'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowReceipt(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl print:shadow-none print:rounded-none">
              <div className="p-10 space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-indigo-200">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Comprovante</h3>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Recibo de Pagamento</p>
                </div>

                <div className="space-y-6 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passageiro</span>
                    <span className="font-black text-slate-900">{showReceipt.passengers?.[0]?.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ônibus</span>
                    <span className="font-black text-slate-900">{buses.find(b => b.id === showReceipt.busId)?.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                    <span className="font-black text-slate-900">{formatCurrency(showReceipt.totalValue)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4 text-emerald-600">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Pago</span>
                    <span className="font-black text-xl">{formatCurrency(showReceipt.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo</span>
                    <span className={cn("font-black", showReceipt.balance > 0 ? "text-rose-500" : "text-emerald-500")}>{formatCurrency(showReceipt.balance)}</span>
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-6 rounded-2xl text-center space-y-1">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Data do Registro</p>
                  <p className="text-sm font-black text-indigo-600">{showReceipt.createdAt?.toDate().toLocaleDateString('pt-BR')} às {showReceipt.createdAt?.toDate().toLocaleTimeString('pt-BR')}</p>
                </div>

                <div className="flex gap-4 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-3"
                  >
                    <Printer size={18} />
                    Imprimir
                  </button>
                  <button
                    onClick={() => setShowReceipt(null)}
                    className="px-8 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Fechar
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
