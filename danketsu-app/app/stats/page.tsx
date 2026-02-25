import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/db/prisma";

export const dynamic = 'force-dynamic'; // キャッシュを無効化して常に最新データを取得

export default async function StatsPage() {
  // 全参加者の統計情報を取得
  const participants = await prisma.participant.findMany({
    orderBy: [
      {
        totalCollected: 'desc',
      },
    ],
  });

  // 収支ランキング計算
  const balanceRanking = participants
    .map((p) => ({
      id: p.id,
      name: p.name,
      balance: p.totalCollected - p.totalPaid,
      totalGames: p.winCount + p.loseCount,
      winRate: p.winCount + p.loseCount > 0 ? (p.winCount / (p.winCount + p.loseCount)) * 100 : 0,
    }))
    .sort((a, b) => b.balance - a.balance);

  // 勝率ランキング計算 (最低5回以上のじゃんけんを行った参加者のみ)
  const minGames = 5;
  const winRateRanking = participants
    .filter((p) => (p.winCount + p.loseCount) >= minGames)
    .map((p) => ({
      id: p.id,
      name: p.name,
      totalGames: p.winCount + p.loseCount,
      winCount: p.winCount,
      loseCount: p.loseCount,
      winRate: (p.winCount / (p.winCount + p.loseCount)) * 100,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  // じゃんけん回数ランキング
  const gameCountRanking = participants
    .map((p) => ({
      id: p.id,
      name: p.name,
      totalGames: p.winCount + p.loseCount,
      winCount: p.winCount,
      loseCount: p.loseCount,
    }))
    .sort((a, b) => b.totalGames - a.totalGames);

  // 総括統計
  const totalStats = await prisma.$transaction([
    prisma.participant.count(),
    prisma.participation.count(),
    prisma.event.aggregate({
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  const [participantsCount, participationsCount, amountSum] = totalStats;
  const jankenCount = Math.floor(participationsCount / 2); // じゃんけんは勝者と敗者の2レコードで1回分

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">統計情報</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">参加者数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{participantsCount}人</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">じゃんけん回数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{jankenCount}回</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総支払額</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{amountSum._sum.totalAmount?.toLocaleString() || 0}円</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均支払額</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {jankenCount > 0
                ? Math.round((amountSum._sum.totalAmount || 0) / jankenCount).toLocaleString()
                : 0}円
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>収支ランキング</CardTitle>
            <CardDescription>獲得金額 - 支払金額</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {balanceRanking.length === 0 ? (
                <p>データがありません</p>
              ) : (
                balanceRanking.map((participant, index) => (
                  <div key={participant.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-bold mr-2 w-6">{index + 1}.</span>
                      <div>
                        <p>{participant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          勝率: {participant.winRate.toFixed(1)}% ({participant.totalGames}回)
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold ${participant.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {participant.balance.toLocaleString()}円
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>勝率ランキング</CardTitle>
            <CardDescription>{minGames}回以上のじゃんけんを行った参加者</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {winRateRanking.length === 0 ? (
                <p>{minGames}回以上じゃんけんを行った参加者がいません</p>
              ) : (
                winRateRanking.map((participant, index) => (
                  <div key={participant.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-bold mr-2 w-6">{index + 1}.</span>
                      <div>
                        <p>{participant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {participant.winCount}勝{participant.loseCount}敗 ({participant.totalGames}回)
                        </p>
                      </div>
                    </div>
                    <span className="font-bold">{participant.winRate.toFixed(1)}%</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>じゃんけん回数ランキング</CardTitle>
            <CardDescription>参加回数が多い順</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gameCountRanking.length === 0 ? (
                <p>データがありません</p>
              ) : (
                gameCountRanking.map((participant, index) => (
                  <div key={participant.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-bold mr-2 w-6">{index + 1}.</span>
                      <div>
                        <p>{participant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {participant.winCount}勝{participant.loseCount}敗
                        </p>
                      </div>
                    </div>
                    <span className="font-bold">{participant.totalGames}回</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
