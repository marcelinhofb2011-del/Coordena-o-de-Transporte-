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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.COORDINATOR], color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'reservations', label: 'Registros', icon: Users, roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.USER], color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'new-reservation', label: 'Novo Registro', icon: PlusCircle, roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.USER], color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'buses', label: 'Ônibus', icon: BusIcon, roles: [UserRole.ADMIN, UserRole.COORDINATOR], color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'congregations', label: 'Congregações', icon: MapPin, roles: [UserRole.ADMIN], color: 'text-violet-600', bg: 'bg-violet-50' },
    { id: 'reports', label: 'Financeiro', icon: FileText, roles: [UserRole.ADMIN, UserRole.COORDINATOR], color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'manifest', label: 'Lista de Chamada', icon: ClipboardList, roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.USER], color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'audit-logs', label: 'Histórico', icon: Activity, roles: [UserRole.ADMIN], color: 'text-slate-600', bg: 'bg-slate-50' },
    { id: 'users', label: 'Usuários', icon: Shield, roles: [UserRole.ADMIN], color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon, roles: [UserRole.ADMIN], color: 'text-slate-900', bg: 'bg-slate-100' },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(appUser?.role || UserRole.USER));

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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isDesktop ? 0 : (isOpen ? 0 : -300) }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          "fixed top-0 left-0 bottom-0 w-72 bg-[#f8f9fa] z-50 lg:translate-x-0 lg:static lg:bg-transparent will-change-transform",
          isOpen ? "shadow-2xl shadow-slate-900/10" : ""
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
          <div className="flex items-center gap-3 mb-10 p-6 border-b border-[#f2f2f2]">
            <div className="w-8 h-8 bg-slate-900 flex items-center justify-center text-white rounded-sm shrink-0">
              <BusIcon size={18} />
            </div>
            <span className="font-bold text-slate-950 tracking-tighter text-base uppercase leading-tight">Coordenação de Transporte</span>
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
                    ? "bg-[#f2f2f2] text-[#0067b8]" 
                    : "text-[#242424] hover:bg-[#f2f2f2]"
                )}
              >
                {currentTab === item.id && (
                  <motion.div 
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 w-1 h-6 bg-[#0067b8] rounded-full" 
                  />
                )}
                <item.icon size={18} className={cn(
                  "shrink-0",
                  currentTab === item.id ? "text-[#0067b8]" : "text-[#707070]"
                )} />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-[#f2f2f2]">
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#e81123] hover:bg-red-50 rounded-sm font-medium transition-colors"
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
