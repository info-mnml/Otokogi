import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/db/prisma";

export const dynamic = 'force-dynamic'; // キャッシュを無効化して常に最新データを取得

export default async function ParticipantsPage() {
  const participants = await prisma.participant.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">参加者一覧</h1>
        <Link href="/participants/new">
          <Button>新規参加者登録</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {participants.length === 0 ? (
          <p>参加者がまだ登録されていません。</p>
        ) : (
          participants.map((participant) => {
            const totalGames = participant.winCount + participant.loseCount;
            const winRate = totalGames > 0 ? Math.round((participant.winCount / totalGames) * 100) : 0;
            const netBalance = participant.totalCollected - participant.totalPaid;

            return (
              <Card key={participant.id}>
                <CardHeader>
                  <CardTitle>{participant.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">勝率</p>
                      <p className="font-bold">{winRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">試合数</p>
                      <p className="font-bold">{totalGames}回</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">獲得金額</p>
                      <p className="font-bold">{participant.totalCollected.toLocaleString()}円</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">支払金額</p>
                      <p className="font-bold">{participant.totalPaid.toLocaleString()}円</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">収支</p>
                    <p className={`font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netBalance.toLocaleString()}円
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link href={`/participants/${participant.id}`} className="w-full">
                    <Button variant="outline" className="w-full">詳細を見る</Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
