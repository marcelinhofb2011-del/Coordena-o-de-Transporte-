import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, LogOut, Shield } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { logout } from './services/firebase';
import LoginView from './views/LoginView';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashboard from './views/Dashboard';
import RegistriesView from './views/RegistriesView';
import NewReservation from './views/NewReservation';
import BusesView from './views/BusesView';
import CongregationsView from './views/CongregationsView';
import ReportsView from './views/ReportsView';
import ManifestView from './views/ManifestView';
import AuditLogsView from './views/AuditLogsView';
import UsersView from './views/UsersView';
import SettingsView from './views/SettingsView';
import { UserRole } from './types';
import NotificationBell from './components/NotificationBell';

export default function App() {
  const { appUser, user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail) setCurrentTab(e.detail);
    };
    window.addEventListener('app:setTab', handleSetTab);
    return () => window.removeEventListener('app:setTab', handleSetTab);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[#0067b8] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // Lógica de bloqueio para usuários não vinculados
  if (appUser && appUser.role !== UserRole.ADMIN && !appUser.congregationId) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center p-6 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-md ms-card p-10">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-sm flex items-center justify-center mx-auto mb-8 border border-amber-100">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[#1b1b1b] mb-4">Acesso Restrito</h2>
          <p className="text-[#707070] text-sm mb-8">
            Seu perfil ({appUser.role === UserRole.COORDINATOR ? 'Coordenador' : 'Apoio'}) ainda não foi vinculado a uma congregação. Por favor, peça ao administrador para vincular sua conta a uma congregação e liberar as permissões necessárias.
          </p>
          <div className="p-3 bg-[#f2f2f2] rounded-sm text-[10px] font-mono text-[#707070] break-all mb-8 text-left">
            USUÁRIO: {appUser.email}<br/>
            ROLE: {appUser.role}<br/>
            UID: {user.uid}
          </div>
          <button 
            onClick={() => logout()}
            className="flex items-center gap-2 px-6 py-2 bg-[#e81123] text-white text-sm font-semibold rounded-sm hover:bg-red-700 transition-all mx-auto shadow-md"
          >
            <LogOut size={16} />
            Sair do Sistema
          </button>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard': return <Dashboard />;
      case 'reservations': return <RegistriesView />;
      case 'new-reservation': return <NewReservation />;
      case 'buses': return <BusesView />;
      case 'congregations': return <CongregationsView />;
      case 'reports': return <ReportsView />;
      case 'manifest': return <ManifestView />;
      case 'audit-logs': return <AuditLogsView />;
      case 'users': return <UsersView />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex overflow-hidden font-sans">
      <Sidebar 
        currentTab={currentTab} 
        setTab={setCurrentTab} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
      />

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Header - Minimal and fluid */}
        <header className="px-6 py-3 md:px-8 bg-white border-b border-[#e5e5e5] print:hidden">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-[#1b1b1b] hover:bg-[#f2f2f2] rounded-sm transition-all active:scale-95 border border-[#e5e5e5]"
              >
                <Menu size={18} />
              </button>
              <h2 className="text-xs font-bold text-[#1b1b1b] uppercase tracking-wider flex items-center gap-2">
                <span className="text-[#0067b8]">COORDENAÇÃO</span>
                <span className="text-[#707070] font-normal">| TRANSPORTE</span>
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-[#1b1b1b] leading-none mb-0.5">{appUser?.name || 'Carregando...'}</p>
                <p className="text-[10px] font-medium text-[#0067b8] uppercase tracking-wide leading-none">
                  {appUser?.role === UserRole.ADMIN ? 'Administrador' : 
                   appUser?.role === UserRole.COORDINATOR ? 'Coordenador' : 'Apoio'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-sm bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                {(appUser?.name || 'U').charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-32 lg:pb-12 bg-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="px-6 py-8 md:px-10 lg:px-12 max-w-7xl mx-auto w-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
      </main>
    </div>
  );
}
