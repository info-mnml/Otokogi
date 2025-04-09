import prisma from '@/lib/prisma';

interface LocalEvent {
  id: string;
  name: string;
  date: string;
  location?: string;
  description?: string;
  totalAmount: number;
}

interface LocalParticipant {
  id: string;
  name: string;
}

interface LocalParticipation {
  id: string;
  eventId: string;
  participantId: string;
  isWinner: boolean;
  paidAmount: number;
}

/**
 * LocalStorageからMongoDBへデータを移行するユーティリティ関数
 */
export async function migrateLocalDataToMongoDB(userId: string) {
  try {
    // ブラウザ環境でのみ実行
    if (typeof window === 'undefined') {
      return { success: false, error: 'Can only be executed in browser environment' };
    }

    // LocalStorageからデータを取得
    const localEvents = JSON.parse(localStorage.getItem('events') || '[]') as LocalEvent[];
    const localParticipants = JSON.parse(localStorage.getItem('participants') || '[]') as LocalParticipant[];
    const localParticipations = JSON.parse(localStorage.getItem('participations') || '[]') as LocalParticipation[];

    // 参加者データの移行
    const participantIdMap = new Map<string, string>();
    for (const localParticipant of localParticipants) {
      const newParticipant = await prisma.participant.create({
        data: {
          name: localParticipant.name,
          userId,
        },
      });
      participantIdMap.set(localParticipant.id, newParticipant.id);
    }

    // イベントデータの移行
    const eventIdMap = new Map<string, string>();
    for (const localEvent of localEvents) {
      const newEvent = await prisma.event.create({
        data: {
          name: localEvent.name,
          date: new Date(localEvent.date),
          location: localEvent.location,
          description: localEvent.description,
          totalAmount: localEvent.totalAmount,
          userId,
        },
      });
      eventIdMap.set(localEvent.id, newEvent.id);
    }

    // 参加記録データの移行
    for (const localParticipation of localParticipations) {
      const newEventId = eventIdMap.get(localParticipation.eventId);
      const newParticipantId = participantIdMap.get(localParticipation.participantId);

      if (newEventId && newParticipantId) {
        await prisma.participation.create({
          data: {
            eventId: newEventId,
            participantId: newParticipantId,
            isWinner: localParticipation.isWinner,
            paidAmount: localParticipation.paidAmount,
          },
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error migrating data:', error);
    return { success: false, error: 'Failed to migrate data' };
  }
}
