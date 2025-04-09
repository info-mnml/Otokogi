import { Event } from "@/types";

// LocalStorageからイベントを取得
export const getEvents = (): Event[] => {
  if (typeof window === 'undefined') return [];
  
  const events = localStorage.getItem('events');
  return events ? JSON.parse(events) : [];
};

// イベントを追加
export const addEvent = (event: Omit<Event, 'id' | 'createdAt'>): Event => {
  const newEvent: Event = {
    ...event,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  
  const events = getEvents();
  const updatedEvents = [newEvent, ...events];
  
  localStorage.setItem('events', JSON.stringify(updatedEvents));
  return newEvent;
};

// 特定のイベントを取得
export const getEvent = (id: string): Event | undefined => {
  const events = getEvents();
  return events.find(event => event.id === id);
};

// イベントを更新
export const updateEvent = (id: string, eventData: Partial<Event>): Event | undefined => {
  const events = getEvents();
  const index = events.findIndex(event => event.id === id);
  
  if (index !== -1) {
    const updatedEvent = { ...events[index], ...eventData };
    events[index] = updatedEvent;
    localStorage.setItem('events', JSON.stringify(events));
    return updatedEvent;
  }
  
  return undefined;
};

// イベントを削除
export const deleteEvent = (id: string): boolean => {
  const events = getEvents();
  const filteredEvents = events.filter(event => event.id !== id);
  
  if (filteredEvents.length < events.length) {
    localStorage.setItem('events', JSON.stringify(filteredEvents));
    return true;
  }
  
  return false;
};
