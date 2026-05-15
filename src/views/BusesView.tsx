import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Bus as BusIcon, Plus, Trash2, Edit2, Phone, User, Users, Info } from 'lucide-react';
import { db } from '../services/firebase';
import { Bus } from '../types';
import { cn } from '../lib/utils';

const BusesView: React.FC = () => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    company: '',
    driver: '',
    driverPhone: '',
    capacity: 50,
    plate: '',
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'buses'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setBuses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus))));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'buses'), { ...formData, createdAt: Timestamp.now() });
    setShowAdd(false);
    setFormData({ name: '', number: '', company: '', driver: '', driverPhone: '', capacity: 50, plate: '', notes: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-16">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight mb-2">Frota</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60">Logística e Transporte</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-slate-900 text-white px-8 py-5 rounded-2xl shadow-2xl shadow-slate-200 hover:scale-105 transition-all flex items-center gap-3 font-black text-xs uppercase tracking-widest self-start md:self-auto">
          <Plus size={18} />
          <span>Novo Ônibus</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-8">
        {buses.map(bus => (
          <motion.div layout key={bus.id} className="group relative flex flex-col pt-6 border-t border-slate-100 hover:border-indigo-200 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shadow-sm transition-all duration-500 group-hover:text-indigo-600">
                <BusIcon size={18} />
              </div>
              <button 
                onClick={async () => await deleteDoc(doc(db, 'buses', bus.id))}
                className="p-1.5 text-slate-200 hover:text-rose-500 transition-colors"
                title="Excluir Unidade"
              >
                <Trash2 size={14} />
              </button>
            </div>
            
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-1">{bus.name}</h3>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-70">{bus.number} • {bus.company}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 py-2 border-b border-slate-50">
                <User size={12} className="text-slate-300" />
                <div className="text-xs">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Motorista</p>
                  <p className="font-bold text-slate-700 tracking-tight text-[13px]">{bus.driver}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2">
                <Users size={12} className="text-slate-300" />
                <div className="text-xs">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Capacidade</p>
                  <p className="font-bold text-slate-700 tracking-tight text-[13px]">{bus.capacity} Assentos</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-[3rem] p-12 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="mb-10">
                <h2 className="text-4xl font-black text-slate-950 tracking-tighter leading-none mb-2">Novo Ônibus</h2>
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Expansão da Frota Logística</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3 col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Identificação / Nome</label>
                    <input required className="w-full px-6 py-5 bg-white border border-slate-200 rounded-2xl outline-none font-black text-slate-950 focus:ring-2 focus:ring-indigo-600 transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Número</label>
                    <input required className="w-full px-6 py-5 bg-white border border-slate-200 rounded-2xl outline-none font-black text-slate-950 focus:ring-2 focus:ring-indigo-600 transition-all" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Capacidade</label>
                    <input required type="number" className="w-full px-6 py-5 bg-white border border-slate-200 rounded-2xl outline-none font-black text-slate-950 focus:ring-2 focus:ring-indigo-600 transition-all" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-3 col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Empresa</label>
                    <input className="w-full px-6 py-5 bg-white border border-slate-200 rounded-2xl outline-none font-black text-slate-950 focus:ring-2 focus:ring-indigo-600 transition-all" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Motorista</label>
                    <input className="w-full px-6 py-5 bg-white border border-slate-200 rounded-2xl outline-none font-black text-slate-950 focus:ring-2 focus:ring-indigo-600 transition-all" value={formData.driver} onChange={e => setFormData({ ...formData, driver: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Telefone</label>
                    <input className="w-full px-6 py-5 bg-white border border-slate-200 rounded-2xl outline-none font-black text-slate-950 focus:ring-2 focus:ring-indigo-600 transition-all" value={formData.driverPhone} onChange={e => setFormData({ ...formData, driverPhone: e.target.value })} />
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full bg-slate-950 text-white py-6 rounded-3xl font-black text-xl hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-200 active:scale-[0.98]">Criar Unidade de Frota</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BusesView;
