import { useState, useCallback } from 'react';

interface ApiOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: T;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useApi() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  const execute = useCallback(async <T>({
    url,
    method = 'GET',
    body,
    onSuccess,
    onError,
  }: ApiOptions<T>) => {
    setLoading(true);
    setError(null);

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'API request failed');
      }

      setData(responseData);
      onSuccess?.(responseData);
      return responseData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, data, execute };
}

// 特定のAPIエンドポイント用のフックを作成
export function useEventsApi() {
  const api = useApi();

  const getEvents = useCallback(() => {
    return api.execute({
      url: '/api/events',
    });
  }, [api]);

  const getEvent = useCallback((id: string) => {
    return api.execute({
      url: `/api/events/${id}`,
    });
  }, [api]);

  const createEvent = useCallback((eventData: any) => {
    return api.execute({
      url: '/api/events',
      method: 'POST',
      body: eventData,
    });
  }, [api]);

  const updateEvent = useCallback((id: string, eventData: any) => {
    return api.execute({
      url: `/api/events/${id}`,
      method: 'PUT',
      body: eventData,
    });
  }, [api]);

  const deleteEvent = useCallback((id: string) => {
    return api.execute({
      url: `/api/events/${id}`,
      method: 'DELETE',
    });
  }, [api]);

  const addJankenResult = useCallback((eventId: string, resultData: any) => {
    return api.execute({
      url: `/api/events/${eventId}/janken`,
      method: 'POST',
      body: resultData,
    });
  }, [api]);

  return {
    ...api,
    getEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    addJankenResult,
  };
}

export function useParticipantsApi() {
  const api = useApi();

  const getParticipants = useCallback(() => {
    return api.execute({
      url: '/api/participants',
    });
  }, [api]);

  const createParticipant = useCallback((participantData: any) => {
    return api.execute({
      url: '/api/participants',
      method: 'POST',
      body: participantData,
    });
  }, [api]);

  const updateParticipant = useCallback((id: string, participantData: any) => {
    return api.execute({
      url: `/api/participants/${id}`,
      method: 'PUT',
      body: participantData,
    });
  }, [api]);

  const deleteParticipant = useCallback((id: string) => {
    return api.execute({
      url: `/api/participants/${id}`,
      method: 'DELETE',
    });
  }, [api]);

  return {
    ...api,
    getParticipants,
    createParticipant,
    updateParticipant,
    deleteParticipant,
  };
}

export function useStatsApi() {
  const api = useApi();

  const getStats = useCallback(() => {
    return api.execute({
      url: '/api/stats',
    });
  }, [api]);

  return {
    ...api,
    getStats,
  };
}
