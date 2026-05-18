import React, { useState } from 'react';
import { Bell, UserPlus, FileText, Info, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../contexts/NotificationContext';
import { NotificationType } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.USER_REGISTRATION: return <UserPlus size={16} className="text-blue-600" />;
      case NotificationType.RESERVATION_NEW: return <FileText size={16} className="text-emerald-600" />;
      case NotificationType.RESERVATION_DELETE: return <Trash2 size={16} className="text-rose-600" />;
      default: return <span className="p-1 bg-slate-100 rounded-sm"><Info size={12} className="text-slate-600" /></span>;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-[#707070] hover:bg-[#f2f2f2] rounded-sm transition-all relative"
      >
        <Bell size={20} className={unreadCount > 0 ? "text-rose-600 animate-pulse" : ""} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white shadow-2xl border border-[#e5e5e5] rounded-sm z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-[#e5e5e5] bg-[#fafafa]">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#1b1b1b]">Notificações</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[#707070]">
                    <Bell size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-xs font-semibold">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <button
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        if (notif.link) {
                          window.dispatchEvent(new CustomEvent('app:setTab', { detail: notif.link }));
                        }
                        setIsOpen(false);
                      }}
                      className={`w-full p-4 text-left border-b border-[#f2f2f2] hover:bg-slate-50 transition-colors flex gap-3 items-start ${!notif.readBy?.length ? 'bg-amber-50/30' : ''}`}
                    >
                      <div className="mt-1">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#1b1b1b] leading-tight mb-1">{notif.title}</p>
                        <p className="text-[10px] text-[#707070] leading-normal line-clamp-2">{notif.message}</p>
                        <p className="text-[9px] text-[#0067b8] mt-2 font-semibold">
                          {notif.createdAt?.toDate ? format(notif.createdAt.toDate(), "dd 'de' MMM, HH:mm", { locale: ptBR }) : ''}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
