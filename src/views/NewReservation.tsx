import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, Timestamp, addDoc, doc, getDoc, getDocs, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  MapPin, 
  Bus as BusIcon, 
  Calendar, 
  Clock, 
  CreditCard, 
  DollarSign, 
  User as UserIcon, 
  FileText,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  X,
  PlusCircle,
  UserPlus,
  Shield
} from 'lucide-react';
import { db, handleFirestoreError, createAuditLog, createNotification } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Bus, Congregation, OperationType, PaymentStatus, Reservation, UserRole, Passenger, LogAction, NotificationType } from '../types';
import { cn, formatCurrency } from '../lib/utils';

const NewReservation: React.FC = () => {
  const { appUser } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalPrice, setGlobalPrice] = useState(0);

  // Form State
  const [passengers, setPassengers] = useState<Passenger[]>([{ name: '', document: '' }]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    notes: '',
    busId: '',
    congregationId: appUser?.congregationId || '',
    paymentMethod: 'Pix',
    amountPaid: 0,
    receivedAmount: 0,
  });

  const availableDays = ['Sexta', 'Sábado', 'Domingo'];

  useEffect(() => {
    if (appUser?.congregationId) {
      setFormData(prev => ({ ...prev, congregationId: appUser.congregationId! }));
    }

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGlobalPrice(data.ticketPrice || 0);
      } else {
        console.warn('Settings global document not found');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    const qBuses = query(collection(db, 'buses'), orderBy('name'));
    const unsubBuses = onSnapshot(qBuses, (snap) => {
      setBuses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'buses');
    });

    const qCongs = query(collection(db, 'congregations'), orderBy('name'));
    const unsubCongs = onSnapshot(qCongs, (snap) => {
      setCongregations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Congregation)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'congregations');
    });

    return () => {
      unsubSettings();
      unsubBuses();
      unsubCongs();
    };
  }, [appUser]);

  const totalValue = passengers.length * selectedDays.length * globalPrice;
  const balance = totalValue - formData.amountPaid;
  const change = Math.max(0, formData.receivedAmount - totalValue);
  const isPaid = formData.amountPaid >= totalValue;
  const isPartial = formData.amountPaid > 0 && formData.amountPaid < totalValue;

  const isAllowedToSell = appUser?.role === UserRole.ADMIN || appUser?.role === UserRole.COORDINATOR || appUser?.canSell;

  if (!isAllowedToSell) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 rounded-full flex items-center justify-center border border-rose-100 dark:border-rose-900/50">
          <Shield size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Acesso Restrito</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs font-medium">
          Sua conta não tem permissão para realizar vendas. Peça ao administrador para liberar a permissão de "Vendas".
        </p>
      </div>
    );
  }

  if (!appUser?.congregationId && appUser?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 rounded-full flex items-center justify-center border border-amber-100 dark:border-amber-900/50">
          <MapPin size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Congregação Necessária</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs font-medium">
          Você tem permissão de venda, mas sua conta ainda não foi vinculada a uma congregação. Peça ao administrador para fazer o vínculo.
        </p>
      </div>
    );
  }

  const handleAddPassenger = () => {
    setPassengers([...passengers, { name: '', document: '' }]);
  };

  const handleRemovePassenger = (index: number) => {
    if (passengers.length === 1) return;
    const newPassengers = [...passengers];
    newPassengers.splice(index, 1);
    setPassengers(newPassengers);
  };

  const handlePassengerChange = (index: number, field: keyof Passenger, value: string) => {
    const newPassengers = [...passengers];
    newPassengers[index][field] = value;
    setPassengers(newPassengers);
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.busId || !formData.congregationId || passengers.some(p => !p.name) || selectedDays.length === 0) {
      setError('Preencha os passageiros e selecione pelo menos um dia.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Verificação de Vagas
      const busRef = doc(db, 'buses', formData.busId);
      const busSnap = await getDoc(busRef);
      const busData = busSnap.data() as Bus;
      if (!busData) throw new Error('Ônibus não encontrado');

      const qOccupancy = query(collection(db, 'reservations'), where('busId', '==', formData.busId));
      const occupancySnap = await getDocs(qOccupancy);
      let currentOccupied = 0;
      occupancySnap.docs.forEach(doc => {
        const resData = doc.data();
        currentOccupied += (resData.passengers?.length || 0);
      });

      if (currentOccupied + passengers.length > busData.capacity) {
        throw new Error(`Limite de vagas excedido no ônibus. Vagas restantes: ${busData.capacity - currentOccupied}`);
      }
      
      const paymentStatus = isPaid ? PaymentStatus.PAGO : (isPartial ? PaymentStatus.PARCIAL : PaymentStatus.PENDENTE);

      const reservation: Partial<Reservation> = {
        passengers,
        days: selectedDays,
        notes: formData.notes,
        busId: formData.busId,
        congregationId: formData.congregationId,
        paymentMethod: formData.paymentMethod,
        unitValue: globalPrice,
        totalValue,
        amountPaid: formData.amountPaid,
        receivedAmount: formData.receivedAmount || formData.amountPaid,
        balance: Math.max(0, balance),
        paymentStatus,
        createdAt: Timestamp.now(),
        createdBy: appUser?.uid
      };

      const docRef = await addDoc(collection(db, 'reservations'), reservation);
      
      await createAuditLog(
        LogAction.RESERVATION_CREATE, 
        `Reserva para ${passengers.length} pass. (${passengers[0].name}) no ônibus ${busData.name}`,
        docRef.id
      );

      // Notify relevant users
      await createNotification({
        title: 'Nova Reserva de Passagens',
        message: `${passengers.length} pass. (${passengers[0].name}) registrados para a congregação ${congregations.find(c => c.id === formData.congregationId)?.name || 'Congregação'}.`,
        type: NotificationType.RESERVATION_NEW,
        targetRoles: [UserRole.ADMIN, UserRole.COORDINATOR],
        congregationId: formData.congregationId,
        link: 'reservations'
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setPassengers([{ name: '', document: '' }]);
      setSelectedDays([]);
      setFormData({
        ...formData,
        notes: '',
        amountPaid: 0,
        receivedAmount: 0,
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao processar reserva');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 pb-6 border-b border-slate-100 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-white border border-slate-800 dark:border-slate-700">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">Novo Registro</h1>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Central de Registros</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none mb-1 text-right">Passagem Unitária</p>
            <p className="text-2xl font-black text-slate-950 dark:text-white tracking-tighter">{formatCurrency(globalPrice)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12 pb-20">
        {/* Identificação dos Passageiros */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-900 dark:text-white transition-colors">
                <UserPlus size={18} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Passageiros</h2>
            </div>
            <button
              type="button"
              onClick={handleAddPassenger}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-sm"
            >
              <Plus size={14} />
              Adicionar
            </button>
          </div>

          <div className="space-y-4">
            {passengers.map((passenger, index) => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                key={index} 
                className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end"
              >
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input required className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-600 dark:border-slate-700 outline-none font-bold text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-blue-400 placeholder:text-slate-300 dark:placeholder:text-slate-700 transition-all" placeholder="Nome" value={passenger.name} onChange={e => handlePassengerChange(index, 'name', e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Documento</label>
                    <input required className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-600 dark:border-slate-700 outline-none font-bold text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-blue-400 placeholder:text-slate-300 dark:placeholder:text-slate-700 transition-all" placeholder="RG/CPF" value={passenger.document} onChange={e => handlePassengerChange(index, 'document', e.target.value)} />
                  </div>
                  {passengers.length > 1 && (
                    <button type="button" onClick={() => handleRemovePassenger(index)} className="p-3 text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-all"><X size={16} /></button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-10">
            {/* Período */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-900 dark:text-white transition-colors">
                  <Calendar size={18} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Período</h2>
              </div>

              <div className="flex flex-wrap gap-3">
                {availableDays.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "flex-1 min-w-[100px] p-5 rounded-2xl font-bold transition-all flex flex-col items-center gap-1.5 border-2",
                      selectedDays.includes(day)
                        ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200 dark:shadow-none"
                        : "bg-white dark:bg-slate-900 border-slate-500 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-800 dark:hover:border-slate-500"
                    )}
                  >
                    <span className="text-2xl">
                      {day === 'Sexta' && '🗓️'}
                      {day === 'Sábado' && '📅'}
                      {day === 'Domingo' && '☀️'}
                    </span>
                    <span className="uppercase text-[9px] tracking-widest">{day}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Logística */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-900 dark:text-white transition-colors">
                  <BusIcon size={18} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Logística</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Ônibus</label>
                  <select
                    required
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-600 dark:border-slate-700 outline-none font-bold text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-blue-400"
                    value={formData.busId}
                    onChange={e => setFormData({ ...formData, busId: e.target.value })}
                  >
                    <option value="" className="dark:bg-slate-900">Selecione</option>
                    {buses.map(bus => (
                      <option key={bus.id} value={bus.id} className="dark:bg-slate-900">{bus.name} - {bus.number}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Congregação</label>
                  <select
                    required
                    className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-600 dark:border-slate-700 outline-none font-bold text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-blue-400 disabled:opacity-60"
                    value={formData.congregationId}
                    disabled={appUser?.role !== UserRole.ADMIN}
                    onChange={e => setFormData({ ...formData, congregationId: e.target.value })}
                  >
                    <option value="" className="dark:bg-slate-900">Selecione</option>
                    {congregations.map(cong => (
                      <option key={cong.id} value={cong.id} className="dark:bg-slate-900">{cong.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-10">
            {/* Pagamento */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-900 dark:text-white transition-colors">
                  <CreditCard size={18} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Pagamento</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Método</label>
                    <select
                      className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-600 dark:border-slate-700 outline-none font-bold text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-blue-400"
                      value={formData.paymentMethod}
                      onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      <option value="Pix" className="dark:bg-slate-900">Pix</option>
                      <option value="Dinheiro" className="dark:bg-slate-900">Dinheiro</option>
                      <option value="Cartão" className="dark:bg-slate-900">Cartão</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Valor Recebido</label>
                    <div className="relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-sans">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pl-6 pr-0 py-3 bg-transparent border-b-2 border-slate-600 dark:border-slate-700 outline-none font-bold text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-blue-400 placeholder:text-slate-200 dark:placeholder:text-slate-800"
                        placeholder="0.00"
                        value={formData.receivedAmount === 0 ? '' : formData.receivedAmount}
                        onChange={e => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          // Auto set amountPaid based on received value
                          const autoPaid = val >= totalValue ? totalValue : val;
                          setFormData({ ...formData, receivedAmount: val, amountPaid: autoPaid });
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest ml-1">Crédito p/ Reserva</label>
                    <div className="relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-sans">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full pl-6 pr-0 py-3 bg-transparent border-b-2 border-slate-600 dark:border-slate-700 outline-none font-bold text-slate-900 dark:text-white focus:border-indigo-500 dark:focus:border-blue-400"
                        value={formData.amountPaid === 0 ? '' : formData.amountPaid}
                        onChange={e => setFormData({ ...formData, amountPaid: e.target.value === '' ? 0 : Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "py-3 rounded-xl font-bold text-[9px] tracking-widest text-center uppercase transition-colors",
                  isPaid ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : (isPartial ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500")
                )}>
                  {isPaid ? 'LIQUIDADO' : (isPartial ? 'PARCIAL' : 'PENDENTE')}
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800 transition-colors">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Geral</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{formatCurrency(totalValue)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-4 bg-slate-950 dark:bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200 dark:shadow-none transition-colors">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                      {formData.receivedAmount > totalValue ? 'Troco' : 'Saldo Devedor'}
                    </span>
                    <span className={cn(
                      "text-2xl font-black tracking-tight", 
                      formData.receivedAmount > totalValue ? "text-emerald-400" : (balance > 0 ? "text-rose-400" : "text-emerald-400")
                    )}>
                      {formatCurrency(formData.receivedAmount > totalValue ? change : Math.max(0, balance))}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 dark:bg-blue-600 text-white py-5 rounded-2xl font-bold text-lg hover:bg-slate-900 dark:hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3 lg:mt-6"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={24} />
                  <span>Finalizar Reserva</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white py-5 px-10 rounded-2xl shadow-2xl z-50 flex items-center gap-3"
          >
            <CheckCircle2 size={24} />
            <span className="font-bold text-lg">Reserva salva com sucesso!</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-rose-600 text-white py-5 px-10 rounded-2xl shadow-2xl z-50 flex items-center gap-3"
          >
            <AlertCircle size={24} />
            <span className="font-bold text-lg">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NewReservation;
