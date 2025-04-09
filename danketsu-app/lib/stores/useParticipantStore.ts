import { create } from "zustand";

type Participant = {
  id: string;
  name: string;
};

type ParticipantStore = {
  participants: Participant[];
  setParticipants: (participants: Participant[]) => void;
};

export const useParticipantStore = create<ParticipantStore>((set) => ({
  participants: [],
  setParticipants: (participants) => set({ participants }),
}));

