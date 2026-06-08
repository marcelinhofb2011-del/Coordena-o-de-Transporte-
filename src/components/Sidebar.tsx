import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bus as BusIcon, 
  Users, 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  LogOut,
  ChevronRight,
  MapPin,
  Menu,
  X,
  Shield,
  Activity,
  ClipboardList,
  Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/firebase';
import { cn } from '../lib/utils';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentTab, setTab, isOpen, setIsOpen }) => {
  const { appUser } = useAuth();
  const [isDesktop, setIsDesktop] = React.useState(window.innerWidth >= 1024);

  React.useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.COORDINATOR], color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { id: 'reservations', label: 'Registros', icon: Users, roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.USER, UserRole.ASSISTANT], color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { id: 'new-reservation', label: 'Novo Registro', icon: PlusCircle, roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.USER, UserRole.ASSISTANT], color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { id: 'buses', label: 'Ônibus', icon: BusIcon, roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.USER, UserRole.ASSISTANT], color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'congregations', label: 'Congregações', icon: MapPin, roles: [UserRole.ADMIN], color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { id: 'reports', label: 'Financeiro', icon: FileText, roles: [UserRole.ADMIN, UserRole.COORDINATOR], color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { id: 'manifest', label: 'Lista de Chamada', icon: ClipboardList, roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.USER, UserRole.ASSISTANT], color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'audit-logs', label: 'Histórico', icon: Activity, roles: [UserRole.ADMIN], color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50' },
    { id: 'users', label: 'Usuários', icon: Shield, roles: [UserRole.ADMIN], color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon, roles: [UserRole.ADMIN], color: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800' },
  ];

  const filteredItems = menuItems.filter(item => {
    const userRole = appUser?.role || UserRole.USER;
    const hasRole = item.roles.includes(userRole);
    if (item.id === 'new-reservation' && (userRole === UserRole.USER || userRole === UserRole.ASSISTANT)) {
      return hasRole && appUser?.canSell;
    }
    return hasRole;
  });

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isDesktop ? 0 : (isOpen ? 0 : -300) }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed top-0 left-0 bottom-0 w-72 bg-[#f8f9fa] dark:bg-slate-900 border-r border-[#f2f2f2] dark:border-slate-800 z-50 lg:translate-x-0 lg:static lg:bg-transparent will-change-transform transition-colors duration-300",
          isOpen ? "shadow-2xl shadow-slate-900/10 dark:shadow-black/50" : ""
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
          <div className="flex items-center gap-3 mb-10 p-6 border-b border-[#f2f2f2] dark:border-slate-800">
            <div className="w-8 h-8 bg-slate-900 dark:bg-slate-700 flex items-center justify-center text-white rounded-sm shrink-0">
              <BusIcon size={18} />
            </div>
            <span className="font-bold text-slate-950 dark:text-white tracking-tighter text-base uppercase leading-tight">Coordenação de Transporte</span>
          </div>

          <nav className="flex-1 px-3 space-y-1 mb-8">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "group w-full flex items-center gap-3 px-3 py-2 text-sm transition-all relative rounded-sm font-medium",
                  currentTab === item.id 
                    ? "bg-[#f2f2f2] dark:bg-slate-800 text-[#0067b8] dark:text-blue-400" 
                    : "text-[#242424] dark:text-slate-400 hover:bg-[#f2f2f2] dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white"
                )}
              >
                {currentTab === item.id && (
                  <motion.div 
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 w-1 h-6 bg-[#0067b8] dark:bg-blue-500 rounded-full" 
                  />
                )}
                <item.icon size={18} className={cn(
                  "shrink-0 transition-colors",
                  currentTab === item.id ? "text-[#0067b8] dark:text-blue-400" : "text-[#707070] dark:text-slate-500"
                )} />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-[#f2f2f2] dark:border-slate-800 space-y-1">
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#e81123] hover:bg-red-50 dark:hover:bg-red-950/20 rounded-sm font-medium transition-colors"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
