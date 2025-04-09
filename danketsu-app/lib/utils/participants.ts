import { Participant } from "@/types";

// LocalStorageから参加者を取得
export const getParticipants = (): Participant[] => {
  if (typeof window === 'undefined') return [];
  
  const participants = localStorage.getItem('participants');
  return participants ? JSON.parse(participants) : [];
};

// 参加者を追加
export const addParticipant = (name: string): Participant => {
  const newParticipant: Participant = {
    id: Date.now().toString(),
    name,
    totalParticipation: 0,
    winCount: 0,
    lossCount: 0,
    totalPaid: 0,
    totalExpected: 0,
    createdAt: new Date().toISOString(),
  };
  
  const participants = getParticipants();
  const updatedParticipants = [newParticipant, ...participants];
  
  localStorage.setItem('participants', JSON.stringify(updatedParticipants));
  return newParticipant;
};

// 特定の参加者を取得
export const getParticipant = (id: string): Participant | undefined => {
  const participants = getParticipants();
  return participants.find(participant => participant.id === id);
};

// 参加者を更新
export const updateParticipant = (id: string, participantData: Partial<Participant>): Participant | undefined => {
  const participants = getParticipants();
  const index = participants.findIndex(participant => participant.id === id);
  
  if (index !== -1) {
    const updatedParticipant = { ...participants[index], ...participantData };
    participants[index] = updatedParticipant;
    localStorage.setItem('participants', JSON.stringify(participants));
    return updatedParticipant;
  }
  
  return undefined;
};

// 参加者を削除
export const deleteParticipant = (id: string): boolean => {
  const participants = getParticipants();
  const filteredParticipants = participants.filter(participant => participant.id !== id);
  
  if (filteredParticipants.length < participants.length) {
    localStorage.setItem('participants', JSON.stringify(filteredParticipants));
    return true;
  }
  
  return false;
};
