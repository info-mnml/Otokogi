import type { Event, EventWithParticipations } from '@/types';

export async function getAllEvents(): Promise<Event[]> {
  const response = await fetch('/api/events');
  if (!response.ok) {
    throw new Error('イベントの取得に失敗しました');
  }
  return response.json();
}

export async function getEventById(id: string): Promise<EventWithParticipations | null> {
  const response = await fetch(`/api/events/${id}`);
  if (!response.ok) {
    throw new Error('イベントの取得に失敗しました');
  }
  return response.json();
}

export async function createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    throw new Error('イベントの作成に失敗しました');
  }
  return response.json();
}

export async function updateEvent(id: string, eventData: Partial<Event>): Promise<Event> {
  const response = await fetch(`/api/events/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventData),
  });

  if (!response.ok) {
    throw new Error('イベントの更新に失敗しました');
  }
  return response.json();
}

export async function deleteEvent(id: string): Promise<void> {
  const response = await fetch(`/api/events/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('イベントの削除に失敗しました');
  }
}
