import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JankenForm } from "@/components/events/janken-form";
import prisma from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export const dynamic = 'force-dynamic'; // キャッシュを無効化して常に最新データを取得

interface EventPageProps {
  params: {
    id: string;
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const eventId = params.id;
  
  // イベント詳細とそれに紐づく参加記録を取得
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    include: {
      participations: {
        include: {
          participant: true,
        },
      },
    },
  });

  if (!event) {
    return notFound();
  }

  // 全参加者を取得
  const allParticipants = await prisma.participant.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  // じゃんけん結果一覧に表示するデータを整形
  const jankenResults = event.participations
    .filter((p) => p.isWinner === true) // 勝者の記録のみ抽出
    .map((p) => {
      // 対応する敗者を探す
      const loserParticipation = event.participations.find(
        (lp) => lp.isWinner === false && lp.jankenChoiceLoser && p.jankenChoiceWinner
      );
      
      if (!loserParticipation) return null;
      
      const loser = allParticipants.find((ap) => ap.id === loserParticipation.participantId);
      
      return {
        id: p.id,
        winner: p.participant.name,
        loser: loser?.name || '不明',
        winnerChoice: p.jankenChoiceWinner,
        loserChoice: loserParticipation.jankenChoiceLoser,
        amount: loserParticipation.amountPaid,
      };
    })
    .filter(Boolean); // nullを除外

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <Link href="/events">
          <Button variant="outline">イベント一覧に戻る</Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>イベント詳細</CardTitle>
          <CardDescription>
            {formatDate(event.date)}
            {event.location && ` @ ${event.location}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {event.description && <p className="mb-4">{event.description}</p>}
          <p className="font-bold text-lg">
            総支払額: {event.totalAmount?.toLocaleString() || 0}円
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>じゃんけん結果登録</CardTitle>
        </CardHeader>
        <CardContent>
          <JankenForm eventId={eventId} participants={allParticipants} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>じゃんけん結果一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {jankenResults.length === 0 ? (
            <p>まだじゃんけん結果が登録されていません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">勝者</th>
                    <th className="text-left py-2">敗者</th>
                    <th className="text-left py-2">勝者の手</th>
                    <th className="text-left py-2">敗者の手</th>
                    <th className="text-right py-2">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {jankenResults.map((result, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2">{result.winner}</td>
                      <td className="py-2">{result.loser}</td>
                      <td className="py-2">{result.winnerChoice}</td>
                      <td className="py-2">{result.loserChoice}</td>
                      <td className="py-2 text-right">{result.amount.toLocaleString()}円</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
