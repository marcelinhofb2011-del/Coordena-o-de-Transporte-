import React, { useState } from 'react';
import { Shield, Calendar, Clock, Sliders, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useEvent } from '../contexts/EventContext';
import { UserRole } from '../types';

// Modular Sections
import { EventsConfigSection } from '../components/settings/EventsConfigSection';
import { ScreenLockSection } from '../components/settings/ScreenLockSection';
import { SystemSettingsSection } from '../components/settings/SystemSettingsSection';

const SettingsView: React.FC = () => {
  const { appUser } = useAuth();
  const { events, activeEventId, countdownConfig } = useEvent();
  const [activeTab, setActiveTab] = useState<'events' | 'lock' | 'system'>('events');

  const [showTabs, setShowTabs] = useState(true);

  // Verify Admin role
  if (appUser?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center border border-rose-100 dark:border-rose-900/40">
          <Shield size={22} />
        </div>
        <h2 className="text-base font-black text-slate-900 dark:text-white">Acesso Restrito</h2>
        <p className="text-slate-500 text-[11px] max-w-xs font-medium leading-relaxed">
          Configurações globais do sistema são restritas a administradores do sistema.
        </p>
      </div>
    );
  }

  const activeEvent = events.find(e => e.id === activeEventId);
  const countdownActive = countdownConfig?.active || false;
  const countdownLiberated = countdownConfig?.liberated || false;

  const tabs = [
    {
      id: 'events' as const,
      label: 'Configurações de Evento',
      description: 'Gerencie congressos, assembleias e selecione qual evento está com vendas ativas.',
      icon: Calendar,
      status: `${events.length} cadastrados`,
      statusColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-[#d2b48c]'
    },
    {
      id: 'lock' as const,
      label: 'Bloqueio de Tela',
      description: 'Bloqueie temporariamente o painel para o público com um cronômetro regressivo.',
      icon: Clock,
      status: !countdownActive ? 'SISTEMA LIVRE' : (countdownLiberated ? 'DESBLOQUEADO' : 'BLOQUEADO'),
      statusColor: !countdownActive 
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
        : (countdownLiberated 
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' 
          : 'bg-[#8B5A2B]/10 text-[#8B5A2B] dark:bg-amber-950/40 dark:text-[#d2b48c] animate-pulse')
    },
    {
      id: 'system' as const,
      label: 'Tarifas do Sistema',
      description: 'Defina as tarifas do evento ativo atual e configure preços individuais por dia.',
      icon: Sliders,
      status: activeEvent ? `Ativo: ${activeEvent.name}` : 'Nenhum ativo',
      statusColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4 px-3 pb-8 relative">
      
      {/* 1. Horizontal Compact Tabs Navigation at the very top */}
      <AnimatePresence>
        {showTabs && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-1 pb-[1px] overflow-hidden"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all relative border-b-2 -mb-[2px] cursor-pointer ${
                    isActive
                      ? 'border-[#8B5A2B] text-[#8B5A2B] dark:text-[#d2b48c] dark:border-[#d2b48c]'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-350 dark:hover:border-slate-700'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-[#8B5A2B] dark:text-[#d2b48c]' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                  <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded ml-1 scale-90 ${
                    isActive 
                      ? 'bg-[#8B5A2B]/10 text-[#8B5A2B] dark:bg-[#d2b48c]/15 dark:text-[#d2b48c]' 
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500'
                  }`}>
                    {tab.id === 'events' ? `${events.length}` : tab.id === 'system' ? (activeEvent ? 'Ativo' : 'Nenhum') : (countdownActive ? (countdownLiberated ? 'Livre' : 'Bloq.') : 'Livre')}
                  </span>
                </button>
              );
            })}

            {/* Ocultar Abas button */}
            <button
              type="button"
              onClick={() => setShowTabs(false)}
              className="ml-auto flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-400 hover:text-[#8B5A2B] text-[9.5px] font-black uppercase tracking-wider rounded transition-all cursor-pointer"
              title="Ocultar Abas (Tela Limpa)"
            >
              <EyeOff size={13} className="text-slate-400 hover:text-[#8B5A2B]" />
              <span className="hidden sm:inline">Ocultar Abas</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Floating show button when hidden */}
      {!showTabs && (
        <div className="flex justify-between items-center bg-[#8B5A2B]/5 dark:bg-[#8B5A2B]/10 border border-[#8B5A2B]/20 dark:border-[#8B5A2B]/30 rounded-xl p-3 shadow-xs animate-fadeIn mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#8B5A2B] dark:text-[#d2b48c] flex items-center gap-1.5 select-none">
            <span className="w-2 h-2 bg-[#8B5A2B] dark:bg-[#d2b48c] rounded-full animate-pulse" />
            Modo de Tela Limpa Ativo 🟤
          </span>
          <button
            type="button"
            onClick={() => setShowTabs(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B5A2B] hover:bg-[#704214] text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 cursor-pointer font-sans"
          >
            <Eye size={13} />
            <span>Mostrar Abas</span>
          </button>
        </div>
      )}

      {/* 3. Redesigned Minimal & Compact Header */}
      {showTabs && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Painel de Configuração</h1>
            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[9px]">
              Gestão Tarifária, Congressos e Cronogramas de Lançamento
            </p>
          </div>
        </div>
      )}

      {/* Render Active Tab with Transitions */}
      <div className="relative pt-1">
        <AnimatePresence mode="wait">
          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <EventsConfigSection />
            </motion.div>
          )}

          {activeTab === 'lock' && (
            <motion.div
              key="lock"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <ScreenLockSection />
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div
              key="system"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <SystemSettingsSection />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SettingsView;
