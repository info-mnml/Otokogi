export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ステータスバッジの色マッピング
function statusBadge(status: string) {
  switch (status) {
    case 'ENTERING':
      return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">明細入力中</span>;
    case 'PAYING':
      return <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">支払待ち</span>;
    case 'CLOSED':
      return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">クローズ</span>;
    default:
      return null;
  }
}

function formatShortDate(date: Date | string | null) {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function fetchDashboardData() {
  const openWarikan = await prisma.warikanEvent.findMany({
    where: { status: { not: 'CLOSED' } },
    include: {
      manager: true,
      participants: { include: { member: true } },
      _count: { select: { expenses: true, settlements: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const recentOtokogi = await prisma.otokogiEvent.findMany({
    include: {
      payer: true,
      participants: { include: { member: true } },
    },
    orderBy: { eventDate: 'desc' },
    take: 5,
  });

  const allOtokogi = await prisma.otokogiEvent.findMany({
    include: { payer: true },
  });

  const totalEvents = allOtokogi.length;
  const totalAmount = allOtokogi.reduce((sum, e) => sum + e.amount, 0);

  const payerMap = new Map<string, { name: string; total: number }>();
  for (const event of allOtokogi) {
    const existing = payerMap.get(event.payerId);
    if (existing) {
      existing.total += event.amount;
    } else {
      payerMap.set(event.payerId, { name: event.payer.name, total: event.amount });
    }
  }
  const topPayer = Array.from(payerMap.values()).sort((a, b) => b.total - a.total)[0];

  return { openWarikan, recentOtokogi, totalEvents, totalAmount, topPayer };
}

export default async function DashboardPage() {
  let data: Awaited<ReturnType<typeof fetchDashboardData>> | null = null;

  try {
    data = await fetchDashboardData();
  } catch {
    // DB未接続時
  }

  if (!data) {
    return (
      <div className="grid gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-amber-600">データベース未接続のため、データを表示できません。</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/warikan">割り勘管理</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/otokogi">男気管理</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/members">メンバー管理</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { openWarikan, recentOtokogi, totalEvents, totalAmount, topPayer } = data;

  return (
    <div className="grid gap-4">
      {/* 累計統計サマリー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">累計統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalEvents}</p>
              <p className="text-xs text-gray-500">総イベント数</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">¥{totalAmount.toLocaleString()}</p>
              <p className="text-xs text-gray-500">累計金額</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{topPayer?.name ?? '-'}</p>
              <p className="text-xs text-gray-500">最多支払者</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 未精算の割り勘 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">未精算の割り勘</CardTitle>
        </CardHeader>
        <CardContent>
          {openWarikan.length === 0 ? (
            <p className="text-sm text-gray-500">未精算の割り勘はありません</p>
          ) : (
            <div className="space-y-3">
              {openWarikan.map((w) => (
                <Link
                  key={w.id}
                  href={`/warikan/${w.id}`}
                  className="block bg-gray-50 rounded-lg p-3 border hover:border-amber-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{w.eventName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        管理: {w.manager?.name ?? '未設定'} / {w.participants.length}人参加
                      </p>
                    </div>
                    {statusBadge(w.status)}
                  </div>
                  {w.paymentDeadline && (
                    <p className="text-xs text-gray-400 mt-2">
                      支払期日: {formatShortDate(w.paymentDeadline)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
          <div className="mt-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/warikan">全て表示</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 最近の男気 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">最近の男気</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOtokogi.length === 0 ? (
            <p className="text-sm text-gray-500">まだ記録がありません</p>
          ) : (
            <div className="space-y-2">
              {recentOtokogi.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${o.payer.colorBg} ${o.payer.colorText}`}>
                      {o.payer.initial}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{o.eventName}</p>
                      <p className="text-xs text-gray-500">
                        {formatShortDate(o.eventDate)} / {o.payer.name}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-slate-800">¥{o.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/otokogi">全て表示</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
