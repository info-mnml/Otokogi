import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = 'force-dynamic'; // キャッシュを無効化して常に最新データを取得

export default async function DashboardPage() {
  // 最近のイベント（最新3件）
  const recentEvents = await prisma.event.findMany({
    orderBy: {
      date: 'desc',
    },
    take: 3,
  });

  // 次回のイベント
  const upcomingEvent = await prisma.event.findFirst({
    where: {
      date: {
        gte: new Date(),
      },
    },
    orderBy: {
      date: 'asc',
    },
  });

  // 収支上位の参加者
  const topParticipants = await prisma.participant.findMany({
    orderBy: [
      {
        totalCollected: 'desc',
      },
    ],
    take: 5,
  });

  // トータル統計
  const totalStats = await prisma.$transaction([
    prisma.event.count(),
    prisma.participant.count(),
    prisma.participation.count(),
    prisma.event.aggregate({
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  const [eventsCount, participantsCount, participationsCount, totalAmount] = totalStats;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">イベント数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{eventsCount}件</p>
          </CardContent>
        </Card>
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
            <p className="text-2xl font-bold">{Math.floor(participationsCount / 2)}回</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総支払額</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalAmount._sum.totalAmount?.toLocaleString() || 0}円</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>次回のイベント</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvent ? (
                <>
                  <h3 className="text-lg font-bold">{upcomingEvent.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(upcomingEvent.date)}
                    {upcomingEvent.location && ` @ ${upcomingEvent.location}`}
                  </p>
                  {upcomingEvent.description && (
                    <p className="mt-2">{upcomingEvent.description}</p>
                  )}
                </>
              ) : (
                <p>予定されているイベントはありません。</p>
              )}
            </CardContent>
            {upcomingEvent && (
              <CardFooter>
                <Link href={`/events/${upcomingEvent.id}`} className="w-full">
                  <Button variant="outline" className="w-full">
                    詳細を見る
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>収支上位参加者</CardTitle>
              <CardDescription>獲得金額が多い順</CardDescription>
            </CardHeader>
            <CardContent>
              {topParticipants.length === 0 ? (
                <p>参加者がまだ登録されていません。</p>
              ) : (
                <div className="space-y-4">
                  {topParticipants.map((participant) => {
                    const netBalance = participant.totalCollected - participant.totalPaid;
                    return (
                      <div key={participant.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            勝率: {participant.winCount + participant.loseCount > 0
                              ? Math.round((participant.winCount / (participant.winCount + participant.loseCount)) * 100)
                              : 0}%
                          </p>
                        </div>
                        <p className={`font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {netBalance.toLocaleString()}円
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>最近のイベント</CardTitle>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <p>イベントがまだ登録されていません。</p>
            ) : (
              <div className="space-y-4">
                {recentEvents.map((event) => (
                  <div key={event.id}>
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={`/events/${event.id}`}>
                          <h3 className="font-bold hover:underline">{event.name}</h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.date)}
                          {event.location && ` @ ${event.location}`}
                        </p>
                      </div>
                      <p className="font-bold">{event.totalAmount?.toLocaleString() || 0}円</p>
                    </div>
                    {event.description && (
                      <p className="mt-1 text-sm">{event.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Link href="/events" className="w-full">
              <Button variant="outline" className="w-full">
                すべてのイベントを見る
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
EOFd, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";

export const dynamic = 'force-dynamic'; // キャッシュを無効化して常に最新データを取得

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: {
      date: 'desc',
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">イベント一覧</h1>
        <Link href="/events/new">
          <Button>新規イベント作成</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.length === 0 ? (
          <p>イベントがまだ登録されていません。</p>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription>
                  {formatDate(event.date)}
                  {event.location && ` @ ${event.location}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {event.description && <p className="text-sm">{event.description}</p>}
                {event.totalAmount !== null && (
                  <p className="mt-2 font-bold">
                    総額: {event.totalAmount.toLocaleString()}円
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Link href={`/events/${event.id}`} className="w-full">
                  <Button variant="outline" className="w-full">詳細を見る</Button>
                </Link>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
