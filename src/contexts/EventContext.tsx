import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface AppEvent {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  ticketPrice?: number;
  dailyPrices?: { [day: string]: number };
  eventType?: 'congresso' | 'assembleia';
  assemblyDay?: string;
}

export interface CountdownConfig {
  active: boolean;
  title: string;
  targetDate: string;
  image: string;
  liberated: boolean;
}

interface EventContextType {
  events: AppEvent[];
  activeEventId: string;
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;
  loadingEvents: boolean;
  addEvent: (name: string, ticketPrice: number, dailyPrices: { [day: string]: number }, eventType?: 'congresso' | 'assembleia', assemblyDay?: string) => Promise<void>;
  updateEvent: (id: string, name: string, ticketPrice: number, dailyPrices: { [day: string]: number }, eventType?: 'congresso' | 'assembleia', assemblyDay?: string) => Promise<void>;
  setActiveEvent: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  countdownConfig: CountdownConfig;
  updateCountdownConfig: (config: Partial<CountdownConfig>) => Promise<void>;
}

const EventContext = createContext<EventContextType>({
  events: [],
  activeEventId: 'default-congress-2026',
  selectedEventId: 'default-congress-2026',
  setSelectedEventId: () => {},
  loadingEvents: true,
  addEvent: async () => {},
  updateEvent: async () => {},
  setActiveEvent: async () => {},
  deleteEvent: async () => {},
  countdownConfig: { active: false, title: '', targetDate: '', image: '', liberated: false },
  updateCountdownConfig: async () => {}
});

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [activeEventId, setActiveEventId] = useState<string>('default-congress-2026');
  const [selectedEventId, setSelectedEventId] = useState<string>('default-congress-2026');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [countdownConfig, setCountdownConfig] = useState<CountdownConfig>({
    active: false,
    title: '',
    targetDate: '',
    image: '',
    liberated: false
  });

  useEffect(() => {
    const docRef = doc(db, 'settings', 'global');
    const unsub = onSnapshot(docRef, async (snap) => {
      let data = snap.data();
      
      if (data && data.countdownConfig) {
        setCountdownConfig(data.countdownConfig);
      } else {
        setCountdownConfig({
          active: false,
          title: '',
          targetDate: '',
          image: '',
          liberated: false
        });
      }
      
      // If global settings don't exist, this initialization will be written on demand when an admin accesses settings or on startup if empty
      if (!data || !data.events || data.events.length === 0) {
        const defaultEvents: AppEvent[] = [
          {
            id: 'default-congress-2026',
            name: 'Congresso de Distrito (19-21 de Junho 2026)',
            active: true,
            createdAt: new Date().toISOString(),
            ticketPrice: data?.ticketPrice || 0,
            dailyPrices: data?.dailyPrices || {
              'Sexta': 42,
              'Sábado': 36,
              'Domingo': 36
            }
          }
        ];
        
        // Use merge to preserve any other setting properties like ticketPrice or dailyPrices
        await setDoc(docRef, {
          events: defaultEvents,
          activeEventId: 'default-congress-2026'
        }, { merge: true });
        
        setEvents(defaultEvents);
        setActiveEventId('default-congress-2026');
        setSelectedEventId('default-congress-2026');
      } else {
        let list = [...data.events] as AppEvent[];
        const hasDefault = list.some(e => e.id === 'default-congress-2026');
        if (!hasDefault) {
          list.push({
            id: 'default-congress-2026',
            name: 'Congresso de Distrito (Anterior/Histórico)',
            ticketPrice: 50,
            dailyPrices: { 'Sexta': 42, 'Sábado': 36, 'Domingo': 36 },
            eventType: 'congresso',
            active: false,
            createdAt: '2026-01-01T00:00:00.000Z'
          });
        }
        const activeId = data.activeEventId || 'default-congress-2026';
        
        setEvents(list);
        setActiveEventId(activeId);
        
        // Recover selected event id from local storage so switching views/reloading doesn't lose current selection
        const cached = localStorage.getItem('selectedEventId');
        if (cached && (cached === 'all' || list.some(e => e.id === cached))) {
          setSelectedEventId(cached);
        } else {
          setSelectedEventId(activeId);
        }
      }
      setLoadingEvents(false);
    });

    return unsub;
  }, []);

  const changeSelectedEventId = (id: string) => {
    setSelectedEventId(id);
    localStorage.setItem('selectedEventId', id);
  };

  const addEvent = async (
    name: string,
    ticketPrice: number,
    dailyPrices: { [day: string]: number },
    eventType?: 'congresso' | 'assembleia',
    assemblyDay?: string
  ) => {
    const docRef = doc(db, 'settings', 'global');
    const newId = 'event-' + Date.now();
    const newEvent: AppEvent = {
      id: newId,
      name: name,
      active: false,
      createdAt: new Date().toISOString(),
      ticketPrice,
      dailyPrices,
      eventType,
      assemblyDay
    };
    
    const updatedEvents = [...events, newEvent];
    await setDoc(docRef, { events: updatedEvents }, { merge: true });
  };

  const updateEvent = async (
    id: string,
    name: string,
    ticketPrice: number,
    dailyPrices: { [day: string]: number },
    eventType?: 'congresso' | 'assembleia',
    assemblyDay?: string
  ) => {
    const docRef = doc(db, 'settings', 'global');
    const updatedEvents = events.map(e => {
      if (e.id === id) {
        return {
          ...e,
          name,
          ticketPrice,
          dailyPrices,
          eventType,
          assemblyDay
        };
      }
      return e;
    });

    const updates: any = {
      events: updatedEvents
    };

    // If we're updating the currently active event, make sure the active prices are in sync
    if (id === activeEventId) {
      if (ticketPrice !== undefined) {
        updates.ticketPrice = ticketPrice;
      }
      if (dailyPrices !== undefined) {
        updates.dailyPrices = dailyPrices;
      }
    }

    await setDoc(docRef, updates, { merge: true });
  };

  const setActiveEvent = async (id: string) => {
    const docRef = doc(db, 'settings', 'global');
    const updatedEvents = events.map(e => ({
      ...e,
      active: e.id === id
    }));
    
    const activeEvent = events.find(e => e.id === id);
    const updates: any = {
      events: updatedEvents,
      activeEventId: id
    };

    if (activeEvent) {
      if (activeEvent.ticketPrice !== undefined) {
        updates.ticketPrice = activeEvent.ticketPrice;
      }
      if (activeEvent.dailyPrices !== undefined) {
        updates.dailyPrices = activeEvent.dailyPrices;
      }
    }
    
    await setDoc(docRef, updates, { merge: true });
    
    changeSelectedEventId(id);
  };

  const deleteEvent = async (id: string) => {
    if (id === activeEventId) {
      throw new Error("Não é possível excluir o evento que está marcado como ATIVO.");
    }
    const docRef = doc(db, 'settings', 'global');
    const updatedEvents = events.filter(e => e.id !== id);
    await setDoc(docRef, { events: updatedEvents }, { merge: true });
  };

  const updateCountdownConfig = async (newConfig: Partial<CountdownConfig>) => {
    const docRef = doc(db, 'settings', 'global');
    const updated = {
      ...countdownConfig,
      ...newConfig
    };
    await setDoc(docRef, { countdownConfig: updated }, { merge: true });
    setCountdownConfig(updated);
  };

  return (
    <EventContext.Provider value={{
      events,
      activeEventId,
      selectedEventId,
      setSelectedEventId: changeSelectedEventId,
      loadingEvents,
      addEvent,
      updateEvent,
      setActiveEvent,
      deleteEvent,
      countdownConfig,
      updateCountdownConfig
    }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => useContext(EventContext);
