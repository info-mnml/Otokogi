import { create } from "zustand";

type Event = {
  id: string;
  title: string;
  date: string;
};

type EventStore = {
  events: Event[];
  setEvents: (events: Event[]) => void;
};

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  setEvents: (events) => set({ events }),
}));

