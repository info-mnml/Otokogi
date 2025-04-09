"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Event, Participant, Participation } from "@/types";
import { getEvents } from "@/lib/utils/events";
import { getParticipants } from "@/lib/utils/participants";
import { getParticipations } from "@/lib/utils/participations";

// 参加者統計情報の型を定義
interface ParticipantStat {
  id: string;
  name: string;
  totalGames: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPaid: number;
  totalExpected: number;
  balance: number;
}

export default function StatsPage() {
  // 明示的に型パラメータを指定
  const [participantStats, setParticipantStats] = useState<ParticipantStat[]>([]);
  const [eventStats, setEventStats] = useState({
    totalEvents: 0,
    totalAmount: 0,
    averageAmount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = () => {
      try {
        // データ取得
        const events = getEvents();
        const participants = getParticipants();
        const participations = getParticipations();
        
        // イベント統計
        const totalEvents = events.length;
        const totalAmount = events.reduce((sum: number, event: Event) => sum + event.totalAmount, 0);
        const averageAmount = totalEvents > 0 ? Math.round(totalAmount / totalEvents) : 0;
        
        setEventStats({
          totalEvents,
          totalAmount,
          averageAmount
        });
        
        // 参加者統計
        const stats = participants.map((participant: Participant) => {
          // この参加者の参加記録を取得
          const records = participations.filter((p: Participation) => p.participantId === participant.id);
          
          // 勝敗回数
          const winCount = records.filter((r: Participation) => r.won).length;
          const lossCount = records.filter((r: Participation) => !r.won).length;
          
          // 支払額と期待支払額
          const totalPaid = records.reduce((sum: number, r: Participation) => sum + (r.paidAmount || 0), 0);
          const totalExpected = records.reduce((sum: number, r: Participation) => sum + (r.expectedAmount || 0), 0);
          
          // 収支（プラスなら得、マイナスなら損）
          const balance = totalExpected - totalPaid;
          
          // 勝率
          const totalGames = winCount + lossCount;
          const winRate = totalGames > 0 ? winCount / totalGames : 0;
          
          return {
            id: participant.id,
            name: participant.name,
            totalGames,
            winCount,
            lossCount,
            winRate,
            totalPaid,
            totalExpected,
            balance
          };
        });
        
        // 収支順にソート（得している順）
        const sortedStats = stats.sort((a, b) => b.balance - a.balance);
        setParticipantStats(sortedStats);
      } catch (error) {
        console.error("統計データの読み込み中にエラーが発生しました", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, []);

  if (loading) {
    return <div className="text-center py-8">データを読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">統計</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">総イベント数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{eventStats.totalEvents} 件</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">総支払額</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">¥{eventStats.totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">平均支払額</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">¥{eventStats.averageAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>参加者収支</CardTitle>
        </CardHeader>
        <CardContent>
          {participantStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">名前</th>
                    <th className="text-right py-2">参加回数</th>
                    <th className="text-right py-2">勝率</th>
                    <th className="text-right py-2">総支払額</th>
                    <th className="text-right py-2">期待支払額</th>
                    <th className="text-right py-2">収支</th>
                  </tr>
                </thead>
                <tbody>
                  {participantStats.map((stat: any) => (
                    <tr key={stat.id} className="border-b">
                      <td className="py-2">{stat.name}</td>
                      <td className="text-right py-2">{stat.totalGames}回</td>
                      <td className="text-right py-2">{Math.round(stat.winRate * 100)}%</td>
                      <td className="text-right py-2">¥{stat.totalPaid.toLocaleString()}</td>
                      <td className="text-right py-2">¥{stat.totalExpected.toLocaleString()}</td>
                      <td className={`text-right py-2 font-medium ${stat.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.balance > 0 ? '+' : ''}¥{stat.balance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">データがまだありません</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}