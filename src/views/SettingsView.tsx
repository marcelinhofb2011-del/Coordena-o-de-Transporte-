import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, Save, DollarSign, Info, Shield } from 'lucide-react';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const SettingsView: React.FC = () => {
  const { appUser } = useAuth();
  const [ticketPrice, setTicketPrice] = useState<number>(0);
  const [dailyPrices, setDailyPrices] = useState<{ [day: string]: number }>({
    'Sexta': 0,
    'Sábado': 0,
    'Domingo': 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (appUser?.role !== UserRole.ADMIN) return;
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const basePrice = data.ticketPrice || 0;
        setTicketPrice(basePrice);
        setDailyPrices(data.dailyPrices || {
          'Sexta': basePrice || 42,
          'Sábado': basePrice || 36,
          'Domingo': basePrice || 36
        });
      }
      setLoading(false);
    });
    return unsub;
  }, [appUser]);

  if (appUser?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
          <Shield size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Acesso Restrito</h2>
        <p className="text-slate-500 max-w-xs font-medium">
          Configurações globais do sistema são restritas a administradores.
        </p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), { 
        ticketPrice,
        dailyPrices 
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-12">
      <div className="mb-16">
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-3">Configurações</h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60">Parâmetros Globais do Sistema</p>
      </div>

      <div className="space-y-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-sm ring-1 ring-slate-100">
            <DollarSign size={22} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Preços das Passagens</h2>
        </div>

        <div className="space-y-8">
          <div className="p-6 bg-indigo-50/50 dark:bg-slate-800/50 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-start gap-4">
            <Info size={20} className="mt-0.5 flex-shrink-0 opacity-60" />
            <p className="text-sm font-bold leading-relaxed">
              Defina os preços específicos para cada dia do congresso. Ao efetuar uma reserva, o valor total será calculado multiplicando o número de passageiros pela soma dos preços dos respectivos dias selecionados.
            </p>
          </div>

          {/* Grid de Preço Diário */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sexta */}
            <div className="space-y-3 p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:border-[#0078d4] dark:hover:border-[#0078d4] transition-all">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
                <span>🗓️</span>
                <span>Sexta-feira</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xl font-black text-slate-900 dark:text-white focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-all"
                  value={dailyPrices['Sexta'] === 0 ? '' : dailyPrices['Sexta']}
                  onChange={(e) => setDailyPrices({ ...dailyPrices, 'Sexta': e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Sábado */}
            <div className="space-y-3 p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:border-[#0078d4] dark:hover:border-[#0078d4] transition-all">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
                <span>📅</span>
                <span>Sábado</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xl font-black text-slate-900 dark:text-white focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-all"
                  value={dailyPrices['Sábado'] === 0 ? '' : dailyPrices['Sábado']}
                  onChange={(e) => setDailyPrices({ ...dailyPrices, 'Sábado': e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Domingo */}
            <div className="space-y-3 p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm hover:border-[#0078d4] dark:hover:border-[#0078d4] transition-all">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
                <span>☀️</span>
                <span>Domingo</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xl font-black text-slate-900 dark:text-white focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] transition-all"
                  value={dailyPrices['Domingo'] === 0 ? '' : dailyPrices['Domingo']}
                  onChange={(e) => setDailyPrices({ ...dailyPrices, 'Domingo': e.target.value === '' ? 0 : Number(e.target.value) })}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          {/* Preço de Fallback */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 block">Preço de Fallback / Outros Eventos</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-2xl opacity-40">R$</span>
              <input
                type="number"
                step="0.01"
                className="w-full pl-16 pr-6 py-6 bg-white dark:bg-slate-900 border-2 border-slate-600 dark:border-slate-800 rounded-[2rem] outline-none text-4xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                value={ticketPrice === 0 ? '' : ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value === '' ? 0 : Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="pt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-slate-200 disabled:opacity-50 active:scale-[0.98]"
          >
            {saving ? (
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Save size={24} />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>

          {success && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-emerald-600 font-black text-center uppercase text-[10px] tracking-[0.3em]"
            >
              ✓ Configurações salvas
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
