import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { db } from '../services/firebase';
import { Congregation } from '../types';

const CongregationsView: React.FC = () => {
  const [congs, setCongs] = useState<Congregation[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'congregations'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setCongs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Congregation))));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'congregations'), { name, createdAt: Timestamp.now() });
    setShowAdd(false);
    setName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-16">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight mb-2">Congregações</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60">Diretório de Unidades</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-slate-900 text-white px-8 py-5 rounded-2xl shadow-2xl shadow-slate-200 hover:scale-105 transition-all flex items-center gap-3 font-black text-xs uppercase tracking-widest self-start md:self-auto">
          <Plus size={18} />
          <span>Nova Congregação</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
        {congs.map(cong => (
          <motion.div layout key={cong.id} className="group flex items-center justify-between py-5 border-t border-slate-100 hover:border-indigo-100 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 shadow-sm transition-all duration-300">
                <MapPin size={18} />
              </div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight">{cong.name}</h3>
            </div>
            <button onClick={() => deleteDoc(doc(db, 'congregations', cong.id))} className="p-2 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Nova Congregação</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Nome</label>
                  <input required autoFocus className="w-full p-4 bg-slate-50 border-none rounded-xl outline-none font-semibold" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <button type="submit" className="w-full bg-rose-500 text-white py-4 rounded-xl font-bold hover:bg-rose-600 transition-all">Salvar</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CongregationsView;
