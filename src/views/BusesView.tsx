import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Bus as BusIcon, Plus, Trash2, Phone, User, Users, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '../services/firebase';
import { Bus, UserRole, Congregation } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const BusesView: React.FC = () => {
  const { appUser } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [isOpenForm, setIsOpenForm] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    company: '',
    driver: '',
    driverPhone: '',
    capacity: 50,
    plate: '',
    notes: '',
    congregationId: ''
  });

  useEffect(() => {
    if (!appUser) return;
    
    const q = query(collection(db, 'buses'));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const allBuses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
      // Sort in-memory client-side
      allBuses.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      if (appUser.role === UserRole.ADMIN) {
        setBuses(allBuses);
      } else {
        setBuses(allBuses.filter(b => b.congregationId === appUser.congregationId));
      }
    });

    return unsubscribe;
  }, [appUser]);

  useEffect(() => {
    // Load congregations to map names and feed Admin selector
    const unsubscribe = onSnapshot(query(collection(db, 'congregations')), (snap) => {
      setCongregations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Congregation)));
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUser) return;

    if (!formData.name || !formData.number || !formData.capacity) {
      alert("Por favor, preencha os campos obrigatórios (Nome, Número e Capacidade).");
      return;
    }

    const busData = {
      ...formData,
      congregationId: appUser.role === UserRole.ADMIN ? formData.congregationId : (appUser.congregationId || ''),
      createdAt: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'buses'), busData);
      setFormData({ 
        name: '', 
        number: '', 
        company: '', 
        driver: '', 
        driverPhone: '', 
        capacity: 50, 
        plate: '', 
        notes: '', 
        congregationId: '' 
      });
    } catch (err) {
      console.error("Erro ao adicionar ônibus:", err);
      alert("Ocorreu um erro ao registrar o ônibus.");
    }
  };

  const getCongregationName = (id: string) => {
    if (!id) return "Geral / Todas";
    const found = congregations.find(c => c.id === id);
    return found ? found.name : "Geral / Todas";
  };

  const canManage = appUser?.role === UserRole.ADMIN || appUser?.role === UserRole.COORDINATOR;

  return (
    <div className="space-y-6 font-sans antialiased text-[#323130] dark:text-slate-100">
      
      {/* Microsoft Dynamics Style Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <BusIcon className="text-[#0078d4]" size={24} />
            <span>Controle de Frota Integrado</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualização de planilha e gerenciamento de capacidade de transporte para Caravanas.
          </p>
        </div>
        
        {canManage && (
          <button 
            type="button"
            onClick={() => setIsOpenForm(!isOpenForm)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            {isOpenForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{isOpenForm ? "Recolher Painel de Cadastro" : "Inserir Novo Ônibus"}</span>
          </button>
        )}
      </div>

      {/* Integrated Tabular Registry Form (Microsoft Forms / Excel Quick Add Style) */}
      <AnimatePresence>
        {canManage && isOpenForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm mb-6">
              <div className="bg-[#f3f2f1] dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-[#323130] dark:text-slate-300 uppercase tracking-wider font-mono">
                  Linha de Entrada de Dados (Novo Ônibus)
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Preencha os campos abaixo de maneira integrada</span>
              </div>
              
              <form onSubmit={handleSubmit} className="p-4 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 items-end">
                {/* Identification */}
                <div className="space-y-1 md:col-span-2 lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Identificação / Nome *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Ônibus 1"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none text-slate-900 dark:text-white transition-all font-medium placeholder-slate-400"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Number */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Número da Ficha *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: 104"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none text-slate-900 dark:text-white transition-all font-medium placeholder-slate-400 font-mono"
                    value={formData.number}
                    onChange={e => setFormData({ ...formData, number: e.target.value })}
                  />
                </div>

                {/* Capacity */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Capacidade *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="Assentos"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none text-slate-900 dark:text-white transition-all font-medium"
                    value={formData.capacity === 0 ? '' : formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: e.target.value === '' ? 0 : Number(e.target.value) })}
                  />
                </div>

                {/* Company */}
                <div className="space-y-1 lg:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Empresa de Transporte</label>
                  <input
                    type="text"
                    placeholder="Ex: Viação União"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none text-slate-900 dark:text-white transition-all font-medium placeholder-slate-400"
                    value={formData.company}
                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>

                {/* Plate */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Placa</label>
                  <input
                    type="text"
                    placeholder="Ex: ABC-1234"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none text-slate-900 dark:text-white transition-all font-medium uppercase font-mono placeholder-slate-400"
                    value={formData.plate}
                    onChange={e => setFormData({ ...formData, plate: e.target.value })}
                  />
                </div>

                {/* Motorista */}
                <div className="space-y-1 col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Motorista</label>
                  <input
                    type="text"
                    placeholder="Nome"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none text-slate-900 dark:text-white transition-all font-medium placeholder-slate-400"
                    value={formData.driver}
                    onChange={e => setFormData({ ...formData, driver: e.target.value })}
                  />
                </div>

                {/* Driver Phone */}
                <div className="space-y-1 col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Telefone Contato</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 99999-0000"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none text-slate-900 dark:text-white transition-all font-medium placeholder-slate-400"
                    value={formData.driverPhone}
                    onChange={e => setFormData({ ...formData, driverPhone: e.target.value })}
                  />
                </div>

                {/* Congregation Dropdown for Admins */}
                {appUser.role === UserRole.ADMIN ? (
                  <div className="space-y-1 lg:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Congregação Associada</label>
                    <select
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none text-slate-900 dark:text-white transition-all"
                      value={formData.congregationId}
                      onChange={e => setFormData({ ...formData, congregationId: e.target.value })}
                    >
                      <option value="">Todas / Sem Vínculo Próprio</option>
                      {congregations.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1 lg:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Congregação</label>
                    <div className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-sm text-slate-400 font-medium truncate">
                      {getCongregationName(appUser.congregationId || '')}
                    </div>
                  </div>
                )}

                {/* Notes/Obs */}
                <div className="space-y-1 lg:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">Observações adicionais</label>
                  <input
                    type="text"
                    placeholder="Ex: Cinto 3 pontos, frigobar, ar condicionado..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-sm focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4] outline-none text-slate-900 dark:text-white transition-all font-medium placeholder-slate-400"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                {/* Submit Action Button */}
                <div className="lg:col-span-2">
                  <button
                    type="submit"
                    className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white py-1.5 px-4 font-bold text-xs uppercase tracking-wider rounded-sm shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow"
                  >
                    <Plus size={14} />
                    <span>Salvar Linha</span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Spreadsheet/Table Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-sm">
        <div className="bg-[#f3f2f1] dark:bg-slate-800/40 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#323130] dark:text-white uppercase tracking-wider font-sans">
              Planilha de Dados de Frota
            </span>
            <span className="bg-slate-200 dark:bg-slate-700 text-[#323130] dark:text-slate-200 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              {buses.length} {buses.length === 1 ? 'Ônibus' : 'Ônibus'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-sans">
            <Info size={12} className="text-[#0078d4] shrink-0" />
            Arraste para os lados para visualizar em telas menores.
          </span>
        </div>

        {buses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500">
            <BusIcon className="mx-auto mb-3 opacity-40 text-slate-400" size={40} />
            <p className="font-bold text-sm">Nenhum ônibus cadastrado na frota corporativa.</p>
            <p className="text-xs mt-1">Insira uma nova linha de ônibus usando o formulário de cadastro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-xs text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-[#323130] dark:text-slate-300 font-sans">
                  <th className="px-4 py-2.5 font-mono border-r border-slate-100 dark:border-slate-800/50 w-20">Ficha</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800/50">Identificação / Modelo</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800/50 w-32">Empresa</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800/50 w-44">Motorista</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800/50 w-36">Telefone</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800/50 w-32">Locado Para</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800/50 w-24">Placa</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 dark:border-slate-800/50 w-28 text-center">Assentos</th>
                  {canManage && <th className="px-4 py-2.5 w-16 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {buses.map((bus) => (
                  <tr 
                    key={bus.id} 
                    className="border-b border-slate-150 dark:border-slate-800/70 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Ficha Number */}
                    <td className="px-4 py-3 font-mono font-bold text-[#0078d4] dark:text-blue-400 bg-slate-50/30 dark:bg-slate-800/10 border-r border-slate-100 dark:border-slate-800/50">
                      Nº {bus.number || "—"}
                    </td>

                    {/* Identification / Name */}
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white border-r border-slate-100 dark:border-slate-800/50">
                      <div className="flex flex-col gap-1">
                        <span>{bus.name}</span>
                        {bus.notes && (
                          <span className="text-[9px] bg-sky-50 dark:bg-sky-950/40 border border-sky-150 dark:border-sky-900/40 text-[#0078d4] dark:text-sky-300 font-normal px-1 py-0.5 rounded-sm w-fit leading-tight">
                            Obs: {bus.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-medium border-r border-slate-100 dark:border-slate-800/50">
                      {bus.company || <span className="italic opacity-40">Não descrita</span>}
                    </td>

                    {/* Motorista/Driver */}
                    <td className="px-4 py-3 text-[#323130] dark:text-slate-200 border-r border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <span className="font-semibold">{bus.driver || <span className="italic font-normal opacity-40">Sem motorista</span>}</span>
                      </div>
                    </td>

                    {/* Fone Contato */}
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/50">
                      {bus.driverPhone ? (
                        <a href={`tel:${bus.driverPhone}`} className="flex items-center gap-1 text-[#0078d4] hover:underline font-medium">
                          <Phone size={11} className="shrink-0" />
                          <span>{bus.driverPhone}</span>
                        </a>
                      ) : (
                        <span className="italic opacity-40">Sem telefone</span>
                      )}
                    </td>

                    {/* Let/Congregation */}
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/50 font-medium font-sans">
                      <div className="truncate max-w-[130px]">
                        {getCongregationName(bus.congregationId)}
                      </div>
                    </td>

                    {/* Vehicle Plate */}
                    <td className="px-4 py-3 border-r border-slate-100 dark:border-slate-800/50">
                      {bus.plate ? (
                        <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded uppercase tracking-wider text-[10px]">
                          {bus.plate}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 font-mono italic">S/P</span>
                      )}
                    </td>

                    {/* Capacity */}
                    <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-white bg-slate-50/10 dark:bg-slate-800/5 border-r border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center justify-center gap-1.5 font-sans">
                        <Users size={12} className="text-slate-400" />
                        <span>{bus.capacity}</span>
                        <span className="text-[10px] font-normal text-slate-400">poltronas</span>
                      </div>
                    </td>

                    {/* Action buttons list */}
                    {canManage && (
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Tem certeza de que deseja remover o ônibus "${bus.name}" (Ficha Nº ${bus.number}) da planilha do sistema? Desassociará as informações de controle.`)) {
                              await deleteDoc(doc(db, 'buses', bus.id));
                            }
                          }}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-red-950/30 rounded-sm transition-colors"
                          title="Excluir Linha"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusesView;
