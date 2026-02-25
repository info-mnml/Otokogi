import { Prisma } from '@prisma/client';

// Prismaが自動生成する型定義を使用
export type Event = Prisma.EventGetPayload<{}>;
export type Participant = Prisma.ParticipantGetPayload<{}>;
export type Participation = Prisma.ParticipationGetPayload<{}>;

// イベントと関連する参加記録を含む拡張タイプ
export type EventWithParticipations = Prisma.EventGetPayload<{
  include: {
    participations: {
      include: {
        participant: true;
      };
    };
  };
}>;

// 参加者と統計情報を含む拡張タイプ
export type ParticipantWithStats = Prisma.ParticipantGetPayload<{
  include: {
    participations: {
      include: {
        event: true;
      };
    };
  };
}> & {
  winRate: number;
  totalEvents: number;
  netBalance: number;
};

// フォーム用の型定義
export type EventFormData = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
export type ParticipantFormData = Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>;
export type JankenFormData = {
  winnerId: string;
  loserId: string;
  winnerChoice: string;
  loserChoice: string;
  amount: number;
};
