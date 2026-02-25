import type { Participation } from '@/types';

export async function getParticipationsByEventId(eventId: string): Promise<Participation[]> {
  const response = await fetch(`/api/events/${eventId}/participations`);
  if (!response.ok) {
    throw new Error('参加記録の取得に失敗しました');
  }
  return response.json();
}

export async function createParticipation(participationData: Omit<Participation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Participation> {
  const response = await fetch('/api/participations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(participationData),
  });

  if (!response.ok) {
    throw new Error('参加記録の作成に失敗しました');
  }
  return response.json();
}

export async function updateParticipation(id: string, participationData: Partial<Participation>): Promise<Participation> {
  const response = await fetch(`/api/participations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(participationData),
  });

  if (!response.ok) {
    throw new Error('参加記録の更新に失敗しました');
  }
  return response.json();
}

export async function recordJankenResult(
  eventId: string,
  winnerId: string,
  loserId: string,
  winnerChoice: string,
  loserChoice: string,
  amount: number
): Promise<void> {
  const response = await fetch(`/api/events/${eventId}/janken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      winnerId,
      loserId,
      winnerChoice,
      loserChoice,
      amount
    }),
  });

  if (!response.ok) {
    throw new Error('じゃんけん結果の記録に失敗しました');
  }
}
