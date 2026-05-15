import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  FileText,
  ClipboardList,
  Settings
} from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  const { appUser } = useAuth();
  if (!appUser) return null;

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.COORDINATOR], color: 'text-indigo-600', bg: 'bg-indigo-600' },
    { id: 'reservations', label: 'Registros', icon: Users, roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.USER], color: 'text-emerald-600', bg: 'bg-emerald-600' },
    { id: 'new-reservation', label: 'Novo', icon: PlusCircle, roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.USER], color: 'text-rose-600', bg: 'bg-rose-600' },
    { id: 'manifest', label: 'Lista', icon: ClipboardList, roles: [UserRole.ADMIN, UserRole.COORDINATOR], color: 'text-amber-600', bg: 'bg-amber-600' },
    { id: 'settings', label: 'Ajustes', icon: Settings, roles: [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.USER], color: 'text-slate-900', bg: 'bg-slate-900' },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(appUser.role));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 print:hidden bg-white border-t border-[#e5e5e5]">
      <div className="px-2 py-2 flex items-center justify-around">
        {filteredItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-3 transition-all duration-300 relative rounded-md",
                isActive ? "text-[#0067b8]" : "text-[#707070]"
              )}
            >
              <div className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md transition-all duration-300",
                isActive ? "bg-[#f2f2f2]" : "bg-transparent"
              )}>
                <item.icon size={18} />
              </div>
              <span className={cn("text-[10px] font-medium leading-none mt-1", !isActive && "opacity-60")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
