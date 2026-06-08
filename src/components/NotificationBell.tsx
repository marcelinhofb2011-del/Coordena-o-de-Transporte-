import React, { useState } from 'react';
import { Bell, UserPlus, FileText, Info, Trash2, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { NotificationType } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { appUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.USER_REGISTRATION: return <UserPlus size={16} className="text-blue-600 dark:text-blue-400" />;
      case NotificationType.RESERVATION_NEW: return <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />;
      case NotificationType.RESERVATION_DELETE: return <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />;
      default: return <span className="p-1 bg-slate-100 dark:bg-slate-800 rounded-sm"><Info size={12} className="text-slate-600 dark:text-slate-400" /></span>;
    }
  };

  const displayedNotifications = notifications.filter(notif => {
    const isUnread = !notif.readBy || !notif.readBy.includes(appUser?.uid || '');
    if (activeTab === 'unread') {
      return isUnread;
    }
    return true;
  });

  return (
    <div className="relative">
      <button 
        onClick={() => {
          // Default to 'unread' if there are unread notifications, else 'all'
          if (!isOpen) {
            setActiveTab(unreadCount > 0 ? 'unread' : 'all');
          }
          setIsOpen(!isOpen);
        }}
        className="p-2 text-[#707070] dark:text-slate-400 hover:bg-[#f2f2f2] dark:hover:bg-slate-800 rounded-sm transition-all relative"
      >
        <Bell size={20} className={unreadCount > 0 ? "text-rose-600 animate-pulse" : ""} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
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
              className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 shadow-2xl border border-[#e5e5e5] dark:border-slate-800 rounded-sm z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-[#e5e5e5] dark:border-slate-800 bg-[#fafafa] dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#1b1b1b] dark:text-white">Notificações</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllAsRead()} 
                      className="text-[10px] text-[#0067b8] dark:text-blue-400 font-bold hover:underline flex items-center gap-1 transition-all"
                    >
                      <CheckCheck size={12} />
                      Marcar todas lidas
                    </button>
                  )}
                </div>
                
                {/* Navigation Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-sm">
                  <button
                    onClick={() => setActiveTab('unread')}
                    className={`flex-1 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-sm transition-all ${
                      activeTab === 'unread' 
                        ? 'bg-white dark:bg-slate-700 text-[#1b1b1b] dark:text-white shadow-xs' 
                        : 'text-[#707070] dark:text-slate-400 hover:text-[#1b1b1b] dark:hover:text-white'
                    }`}
                  >
                    Não lidas ({unreadCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-sm transition-all ${
                      activeTab === 'all' 
                        ? 'bg-white dark:bg-slate-700 text-[#1b1b1b] dark:text-white shadow-xs' 
                        : 'text-[#707070] dark:text-slate-400 hover:text-[#1b1b1b] dark:hover:text-white'
                    }`}
                  >
                    Todas ({notifications.length})
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto scrollbar-hide divide-y divide-[#f2f2f2] dark:divide-slate-800">
                {displayedNotifications.length === 0 ? (
                  <div className="p-8 text-center text-[#707070] dark:text-slate-500">
                    <Bell size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-xs font-semibold">
                      {activeTab === 'unread' ? 'Nenhuma nova notificação' : 'Nenhuma notificação encontrada'}
                    </p>
                  </div>
                ) : (
                  displayedNotifications.map(notif => {
                    const isUnread = !notif.readBy || !notif.readBy.includes(appUser?.uid || '');
                    return (
                      <button
                        key={notif.id}
                        onClick={() => {
                          markAsRead(notif.id);
                          if (notif.link) {
                            window.dispatchEvent(new CustomEvent('app:setTab', { detail: notif.link }));
                          }
                          setIsOpen(false);
                        }}
                        className={`w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex gap-3 items-start relative ${
                          isUnread 
                            ? 'bg-blue-50/20 dark:bg-blue-900/10 border-l-2 border-blue-500' 
                            : 'opacity-65 hover:opacity-100 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="mt-1 flex-shrink-0">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs text-[#1b1b1b] dark:text-white leading-tight mb-1 ${isUnread ? 'font-extrabold' : 'font-semibold'}`}>
                              {notif.title}
                            </p>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0 animate-ping absolute right-3" />
                            )}
                          </div>
                          <p className={`text-[10px] leading-normal line-clamp-2 ${isUnread ? 'text-[#333333] dark:text-slate-200' : 'text-[#707070] dark:text-slate-400'}`}>
                            {notif.message}
                          </p>
                          <p className="text-[9px] text-[#0067b8] dark:text-blue-400 mt-2 font-semibold">
                            {notif.createdAt?.toDate ? format(notif.createdAt.toDate(), "dd 'de' MMM, HH:mm", { locale: ptBR }) : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })
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
