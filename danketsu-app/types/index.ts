// types/index.ts

export interface Event {
  id: string;
  name: string;
  date: string;
  venue: string;
  totalAmount: number;
  hasJankenResult?: boolean;
  createdAt: string;
}

export interface Participant {
  id: string;
  name: string;
  // 統計情報
  totalParticipation?: number;
  winCount?: number;
  lossCount?: number;
  totalPaid?: number;
  totalExpected?: number;
  createdAt: string;
}

export interface Participation {
  id: string;
  eventId: string;
  participantId: string;
  attended: boolean;
  won: boolean;
  paidAmount: number;
  expectedAmount: number;
}