// lib/utils/participations.ts
import { Participation, Event } from "@/types";
import { getEvent, updateEvent, getEvents } from "./events";

// LocalStorageから参加記録を取得
export const getParticipations = (): Participation[] => {
  if (typeof window === 'undefined') return [];
    
  const participations = localStorage.getItem('participations');
  return participations ? JSON.parse(participations) : [];
};

// イベントIDに基づく参加記録の取得
export const getParticipationsByEventId = (eventId: string): Participation[] => {
  const participations = getParticipations();
  return participations.filter((p: Participation) => p.eventId === eventId);
};

// 参加記録の追加
export const addParticipations = (eventId: string, records: Omit<Participation, 'id'>[]): Participation[] => {
  const newParticipations = records.map(record => ({
    ...record,
    id: Date.now() + Math.random().toString(36).substring(2, 9),
    eventId
  }));
    
  const participations = getParticipations();
    
  // 同じイベントの既存の参加記録を削除（更新の場合）
  const filteredParticipations = participations.filter((p: Participation) => p.eventId !== eventId);
    
  // 新しい参加記録を追加
  const updatedParticipations = [...filteredParticipations, ...newParticipations];
    
  localStorage.setItem('participations', JSON.stringify(updatedParticipations));
    
  // イベントに「じゃんけん済み」フラグを追加
  const event = getEvent(eventId);
  if (event) {
    // 勝者がいることを確認してからフラグを設定
    const hasWinner = newParticipations.some((p: Participation) => p.won === true);
    if (hasWinner) {
      updateEvent(eventId, { hasJankenResult: true });
      console.log(`イベント ${eventId} にじゃんけん結果を登録しました`);
    } else {
      console.warn(`イベント ${eventId} に勝者が設定されていません`);
    }
  }
    
  return newParticipations;
};

// イベントのじゃんけん結果があるかチェック
export const hasJankenResult = (eventId: string): boolean => {
  // 参加記録から確認
  const participations = getParticipationsByEventId(eventId);
  const hasValidResults = participations.length > 0 && participations.some((p: Participation) => p.won);
    
  // イベントのフラグから確認
  const event = getEvent(eventId);
  const hasEventFlag = event?.hasJankenResult === true;
    
  // データとフラグの整合性を確認し、問題があればコンソールに警告
  if (hasEventFlag !== hasValidResults) {
    console.warn(
      `イベント ${eventId} のじゃんけん結果フラグと実際のデータに不一致があります。`, 
      { hasEventFlag, hasValidResults }
    );
    
    // フラグを修正（実際のデータに基づいて）
    if (event && hasValidResults !== hasEventFlag) {
      updateEvent(eventId, { hasJankenResult: hasValidResults });
      console.log(`イベント ${eventId} のhasJankenResultフラグを修正しました: ${hasValidResults}`);
    }
  }
    
  // 実際のデータに基づいた結果を返す
  return hasValidResults;
};

// すべてのじゃんけん結果を取得（統計ページ用）
export const getAllJankenResults = () => {
  const events = getEvents();
  const participations = getParticipations();
  
  // イベントごとの結果をグループ化
  return events
    .filter((event: Event) => hasJankenResult(event.id))
    .map((event: Event) => {
      const eventParticipations = participations.filter(
        (p: Participation) => p.eventId === event.id
      );
      const winner = eventParticipations.find((p: Participation) => p.won);
      
      return {
        eventId: event.id,
        eventName: event.name,
        date: event.date,
        amount: event.totalAmount,
        participants: eventParticipations,
        winner: winner ? winner.participantId : null
      };
    });
};