"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Event, Participant } from "@/types";
import { getEvents } from "@/lib/utils/events";
import { getParticipants } from "@/lib/utils/participants";
import { getAllJankenResults } from "@/lib/utils/participations";

export default function Dashboard() {
  const [stats, setStats] = useState<{
    events: Event[];
    participants: Participant[];
    totalAmount: number;
    recentEvents: Event[];
    topWinners: any[];
  }>({
    events: [],
    participants: [],
    totalAmount: 0,
    recentEvents: [],
    topWinners: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // データ取得
      const events = getEvents();
      const participants = getParticipants();
      const jankenResults = getAllJankenResults();
      
      // 総支払額
      const totalAmount = events.reduce((sum: number, event: Event) => sum + event.totalAmount, 0);
      
      // 最近のイベント（日付順）
      const recentEvents = [...events]
        .sort((a: Event, b: Event) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      
      // 勝率計算
      const winRates = participants.map((participant: Participant) => {
        const participationCount = participant.totalParticipation || 0;
        const winCount = participant.winCount || 0;
        const winRate = participationCount > 0 ? winCount / participationCount : 0;
        
        return {
          id: participant.id,
          name: participant.name,
          winRate,
          winCount,
          participationCount
        };
      }).sort((a, b) => b.winRate - a.winRate);

      setStats({
        events,
        participants,
        totalAmount,
        recentEvents,
        topWinners: winRates.slice(0, 3)
      });
    } catch (error) {
      console.error("ダッシュボードデータの読み込み中にエラーが発生しました", error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div className="text-center py-8">データを読み込み中...</div>;
  }

  // 次回イベント（現在日付以降で最も近い日付）を計算
  const now = new Date();
  const nextEvent = stats.events
    .filter((event: Event) => new Date(event.date) >= now)
    .sort((a: Event, b: Event) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  // 勝率トップの参加者を取得
  const topWinner = stats.topWinners.length > 0 ? stats.topWinners[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <Button onClick={() => window.location.href = "/events/new"}>新規イベント</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">次回イベント</CardTitle>
          </CardHeader>
          <CardContent>
            {nextEvent ? (
              <p className="text-2xl font-semibold text-gray-900">{nextEvent.name}</p>
            ) : (
              <p className="text-2xl font-semibold text-gray-900">未定</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">参加者数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-gray-900">{stats.participants.length} 名</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">総支払額</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-gray-900">¥{stats.totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">勝率トップ</CardTitle>
          </CardHeader>
          <CardContent>
            {topWinner && topWinner.participationCount > 0 ? (
              <p className="text-2xl font-semibold text-gray-900">
                {topWinner.name} ({Math.round(topWinner.winRate * 100)}%)
              </p>
            ) : (
              <p className="text-2xl font-semibold text-gray-900">-</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>最近のイベント</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentEvents.length > 0 ? (
            <div className="space-y-4">
              {stats.recentEvents.map((event: Event) => (
                <div key={event.id} className="flex justify-between items-center">
                  <div>
                    <Link href={`/events/${event.id}`} className="text-lg font-medium hover:underline">
                      {event.name}
                    </Link>
                    <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString()}</p>
                  </div>
                  <p className="font-medium">¥{event.totalAmount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">イベントはまだありません</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}