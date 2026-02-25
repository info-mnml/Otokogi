import type { Participant, ParticipantWithStats } from '@/types';

export async function getAllParticipants(): Promise<Participant[]> {
  const response = await fetch('/api/participants');
  if (!response.ok) {
    throw new Error('参加者の取得に失敗しました');
  }
  return response.json();
}

export async function getParticipantById(id: string): Promise<ParticipantWithStats | null> {
  const response = await fetch(`/api/participants/${id}`);
  if (!response.ok) {
    throw new Error('参加者の取得に失敗しました');
  }
  return response.json();
}

export async function createParticipant(participantData: Omit<Participant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Participant> {
  const response = await fetch('/api/participants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(participantData),
  });

  if (!response.ok) {
    throw new Error('参加者の作成に失敗しました');
  }
  return response.json();
}

export async function updateParticipant(id: string, participantData: Partial<Participant>): Promise<Participant> {
  const response = await fetch(`/api/participants/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(participantData),
  });

  if (!response.ok) {
    throw new Error('参加者の更新に失敗しました');
  }
  return response.json();
}

export async function deleteParticipant(id: string): Promise<void> {
  const response = await fetch(`/api/participants/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('参加者の削除に失敗しました');
  }
}
