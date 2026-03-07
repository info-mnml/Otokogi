"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Member = {
  id: string;
  name: string;
  fullName: string;
  initial: string;
  colorBg: string;
  colorText: string;
  paypayId: string | null;
};

type Expense = {
  id: string;
  payerId: string;
  description: string;
  amount: number;
  payer: Member;
};

type Settlement = {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  isPaid: boolean;
  isReceived: boolean;
  fromMember: Member;
  toMember: Member;
};

type WarikanDetail = {
  id: string;
  eventName: string;
  status: 'ENTERING' | 'PAYING' | 'CLOSED';
  detailDeadline: string | null;
  paymentDeadline: string | null;
  memo: string | null;
  walicaUrl: string | null;
  manager: Member | null;
  participants: { member: Member }[];
  expenses: Expense[];
  settlements: Settlement[];
};

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

function formatShortDate(date: string | null) {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function WarikanDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [event, setEvent] = useState<WarikanDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 明細追加フォーム
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expensePayerId, setExpensePayerId] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/warikan/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEvent(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleAddExpense = async () => {
    if (!expensePayerId || !expenseDescription || !expenseAmount) return;
    setSubmitting(true);

    const res = await fetch(`/api/warikan/${id}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payerId: expensePayerId,
        description: expenseDescription,
        amount: Number(expenseAmount),
      }),
    });

    if (res.ok) {
      setExpensePayerId('');
      setExpenseDescription('');
      setExpenseAmount('');
      setShowExpenseForm(false);
      fetchEvent();
    } else {
      alert('追加に失敗しました');
    }
    setSubmitting(false);
  };

  const handleCalculateSettlements = async () => {
    setSubmitting(true);
    const res = await fetch(`/api/warikan/${id}/settlements`, {
      method: 'POST',
    });
    if (res.ok) {
      fetchEvent();
    } else {
      const data = await res.json();
      alert(data.error || '精算計算に失敗しました');
    }
    setSubmitting(false);
  };

  const handleSettlementAction = async (settlementId: string, action: 'pay' | 'receive') => {
    const res = await fetch(`/api/warikan/${id}/settlements/${settlementId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      fetchEvent();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const res = await fetch(`/api/warikan/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      fetchEvent();
    }
  };

  if (loading) return <p className="text-sm text-gray-500">読み込み中...</p>;
  if (!event) return <p className="text-sm text-gray-500">イベントが見つかりません</p>;

  const totalExpenses = event.expenses.reduce((sum, e) => sum + e.amount, 0);
  const perPerson = event.participants.length > 0 ? Math.round(totalExpenses / event.participants.length) : 0;
  const receivedCount = event.settlements.filter((s) => s.isReceived).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/warikan" className="text-gray-500 hover:text-gray-700">← 戻る</Link>
        <h2 className="text-xl font-bold text-slate-800">精算詳細</h2>
      </div>

      <div className="space-y-4">
        {/* イベント情報 */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{event.eventName}</h3>
                <p className="text-sm text-gray-500 mt-1">管理大臣: {event.manager?.name ?? '未設定'}（{event.manager?.fullName ?? ''}）</p>
              </div>
              <Select value={event.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-auto">
                  {statusBadge(event.status)}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTERING">明細入力中</SelectItem>
                  <SelectItem value="PAYING">支払待ち</SelectItem>
                  <SelectItem value="CLOSED">クローズ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div><span className="text-gray-400">明細追加期日:</span> {formatShortDate(event.detailDeadline)}</div>
              <div><span className="text-gray-400">支払期日:</span> {formatShortDate(event.paymentDeadline)}</div>
            </div>
            <div className="mt-3">
              <span className="text-xs text-gray-400">参加者:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {event.participants.map((p) => (
                  <span key={p.member.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {p.member.name}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 立替明細 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">立替明細</CardTitle>
          </CardHeader>
          <CardContent>
            {event.expenses.length === 0 ? (
              <p className="text-sm text-gray-500">まだ明細がありません</p>
            ) : (
              <div className="space-y-2">
                {event.expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{expense.payer.name}（{expense.payer.fullName}）</p>
                      <p className="text-xs text-gray-500">{expense.description}</p>
                    </div>
                    <p className="font-bold text-slate-800">¥{expense.amount.toLocaleString()}</p>
                  </div>
                ))}
                <div className="flex justify-between mt-3 pt-3 border-t font-bold text-slate-800">
                  <span>合計</span>
                  <span>¥{totalExpenses.toLocaleString()}（1人あたり ¥{perPerson.toLocaleString()}）</span>
                </div>
              </div>
            )}

            {/* 明細追加フォーム */}
            {event.status === 'ENTERING' && (
              <>
                {showExpenseForm ? (
                  <div className="mt-4 bg-gray-50 rounded-lg p-3 border space-y-2">
                    <div className="flex gap-2">
                      <Select value={expensePayerId} onValueChange={setExpensePayerId}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="立替者" />
                        </SelectTrigger>
                        <SelectContent>
                          {event.participants.map((p) => (
                            <SelectItem key={p.member.id} value={p.member.id}>
                              {p.member.name}（{p.member.fullName}）
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        className="w-28 text-right font-mono"
                        placeholder="金額"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                      />
                    </div>
                    <Input
                      placeholder="内容（例: コート代）"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExpenseForm(false)}
                      >
                        キャンセル
                      </Button>
                      <Button
                        size="sm"
                        className="bg-slate-800 hover:bg-slate-700"
                        onClick={handleAddExpense}
                        disabled={submitting || !expensePayerId || !expenseDescription || !expenseAmount}
                      >
                        追加
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="mt-3 w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition"
                    onClick={() => setShowExpenseForm(true)}
                  >
                    + 立替を追加
                  </button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 精算計算ボタン */}
        {event.status === 'ENTERING' && event.expenses.length > 0 && (
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium"
            onClick={handleCalculateSettlements}
            disabled={submitting}
          >
            精算を計算する
          </Button>
        )}

        {/* 精算結果 */}
        {event.settlements.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-800">精算結果</CardTitle>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  {receivedCount}/{event.settlements.length} 受領済
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.settlements.map((settlement) => (
                  <div key={settlement.id} className="bg-gray-50 rounded-lg p-3 border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{settlement.fromMember.name}</span>
                        <span className="text-gray-400">&rarr;</span>
                        <span className="font-medium">{settlement.toMember.name}</span>
                      </div>
                      <span className="font-bold text-lg">¥{settlement.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {settlement.toMember.paypayId && (
                          <>送金先: <span className="text-red-500 font-mono font-medium">@{settlement.toMember.paypayId}</span></>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        {settlement.toMember.paypayId && (
                          <a
                            href={`paypay://transfer?userId=${settlement.toMember.paypayId}&amount=${settlement.amount}`}
                            className="inline-flex items-center gap-1 bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-red-600 transition"
                          >
                            Pay 送金
                          </a>
                        )}
                        {!settlement.isPaid && event.status !== 'CLOSED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSettlementAction(settlement.id, 'pay')}
                          >
                            送金済み
                          </Button>
                        )}
                        {settlement.isPaid && !settlement.isReceived && event.status !== 'CLOSED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-300"
                            onClick={() => handleSettlementAction(settlement.id, 'receive')}
                          >
                            受領確認
                          </Button>
                        )}
                        {settlement.isReceived && (
                          <span className="text-xs text-green-600 font-medium">受領済み</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                ※ 立替者（受取人）が「受領確認」をチェック。全員受領で自動的にクローズ
              </p>
            </CardContent>
          </Card>
        )}

        {/* メモ */}
        {event.memo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-800">メモ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{event.memo}</p>
            </CardContent>
          </Card>
        )}

        {/* walicaリンク */}
        {event.walicaUrl && (
          <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">W</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">walicaで確認</p>
                <p className="text-xs text-gray-500">移行前のwalicaデータを参照</p>
              </div>
              <a href={event.walicaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm font-medium hover:underline">
                開く &rarr;
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
