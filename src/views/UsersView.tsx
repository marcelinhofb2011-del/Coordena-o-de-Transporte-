import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserCheck, Shield, MapPin, Trash2, Search, Mail } from 'lucide-react';
import { db } from '../services/firebase';
import { AppUser, UserRole, Congregation } from '../types';
import { cn } from '../lib/utils';

const UsersView: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [congs, setCongs] = useState<Congregation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser)));
    });
    const unsubCongs = onSnapshot(collection(db, 'congregations'), (snap) => {
      setCongs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Congregation)));
    });
    return () => { unsubUsers(); unsubCongs(); };
  }, []);

  const handleUpdateRole = async (uid: string, role: UserRole) => {
    await updateDoc(doc(db, 'users', uid), { role });
  };

  const handleUpdateCong = async (uid: string, congregationId: string) => {
    await updateDoc(doc(db, 'users', uid), { congregationId });
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-slate-900 leading-tight">Gerenciar Acessos</h1>
        <p className="text-slate-500 font-medium">Controle quem pode acessar cada congregação</p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Pesquisar por nome ou email..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.map((user) => (
          <motion.div layout key={user.uid} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1 flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl border-2 border-white shadow-sm ring-2 ring-slate-50">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-lg truncate">{user.name}</h3>
                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                  <Mail size={14} />
                  <span className="truncate">{user.email}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nível de Acesso</label>
                <select 
                  className="bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={user.role}
                  onChange={(e) => handleUpdateRole(user.uid, e.target.value as UserRole)}
                >
                  <option value={UserRole.USER}>Apoio</option>
                  <option value={UserRole.COORDINATOR}>Coordenador</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </div>

              {/* Congregation Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Congregação</label>
                <select 
                  className={cn(
                    "bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500",
                    !user.congregationId ? "text-rose-500" : "text-slate-700"
                  )}
                  value={user.congregationId || ''}
                  onChange={(e) => handleUpdateCong(user.uid, e.target.value)}
                >
                  <option value="">NÃO VINCULADO</option>
                  {congs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <button 
                onClick={() => deleteDoc(doc(db, 'users', user.uid))}
                className="p-3 bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-xl mt-5"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default UsersView;
