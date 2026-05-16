import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  where, 
  Timestamp, 
  doc, 
  updateDoc, 
  arrayUnion,
  addDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { Notification, NotificationType, UserRole } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  createNotification: (data: Omit<Notification, 'id' | 'createdAt' | 'readBy'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { appUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Query notifications that target the user's role
    // Or target the user's congregation (if relevant)
    const q = query(
      collection(db, 'notifications'),
      where('targetRoles', 'array-contains', appUser.role),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let filtered = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Notification));

      // Further filter by congregation if specified in the notification
      filtered = filtered.filter(notif => {
        if (!notif.congregationId) return true;
        return notif.congregationId === appUser.congregationId;
      });

      setNotifications(filtered);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to notifications:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [appUser]);

  const unreadCount = notifications.filter(n => !n.readBy || !n.readBy.includes(appUser?.uid || '')).length;

  const markAsRead = async (notificationId: string) => {
    if (!appUser) return;
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, {
        readBy: arrayUnion(appUser.uid)
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const createNotification = async (data: Omit<Notification, 'id' | 'createdAt' | 'readBy'>) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...data,
        readBy: [],
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, markAsRead, createNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
