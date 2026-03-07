"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  initial: string;
  colorBg: string;
  colorText: string;
};

type OtokogiEvent = {
  id: string;
  eventDate: string;
  eventName: string;
  amount: number;
  place: string | null;
  hasAlbum: boolean;
  payer: Member;
  participants: { member: Member }[];
};

type PerMember = {
  id: string;
  name: string;
  count: number;
  participated: number;
  totalPaid: number;
  winRate: number;
};

type StatsData = {
  totalCount: number;
  totalAmount: number;
  averageAmount: number;
  perMember: PerMember[];
  heatmap: Record<string, Record<string, number>>;
  deviationScores: { id: string; name: string; totalPaid: number; score: number }[];
  streaks: { id: string; name: string; maxStreak: number; currentStreak: number }[];
  records: { label: string; value: number | string; detail?: string }[];
};

type Tab = 'history' | 'ranking' | 'stats';

export default function OtokogiPage() {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [events, setEvents] = useState<OtokogiEvent[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [yearFilter, setYearFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (yearFilter !== 'all') params.set('year', yearFilter);
    const res = await fetch(`/api/otokogi?${params.toString()}`);
    const data = await res.json();
    setEvents(data);
    setLoading(false);
  }, [yearFilter]);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/otokogi/stats');
    const data = await res.json();
    setStats(data);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (activeTab === 'stats' || activeTab === 'ranking') {
      fetchStats();
    }
  }, [activeTab, fetchStats]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // ランキング（年度フィルタで変わるのでeventsから計算）
  const rankingData = (() => {
    const map = new Map<string, { name: string; total: number; count: number; initial: string; colorBg: string; colorText: string }>();
    for (const e of events) {
      const existing = map.get(e.payer.id);
      if (existing) {
        existing.total += e.amount;
        existing.count++;
      } else {
        map.set(e.payer.id, {
          name: e.payer.name,
          total: e.amount,
          count: 1,
          initial: e.payer.initial,
          colorBg: e.payer.colorBg,
          colorText: e.payer.colorText,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  })();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">男気管理</h2>
        <Button asChild className="bg-slate-800 hover:bg-slate-700">
          <Link href="/otokogi/new">+ 記録する</Link>
        </Button>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'history' as Tab, label: '履歴' },
          { key: 'ranking' as Tab, label: 'ランキング' },
          { key: 'stats' as Tab, label: '統計' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              activeTab === tab.key ? 'bg-slate-800 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 年度フィルタ（履歴・ランキング） */}
      {activeTab !== 'stats' && (
        <div className="flex gap-2 mb-4">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-auto">
              <SelectValue>{yearFilter === 'all' ? '全期間' : `${yearFilter}年`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全期間</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}年</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 履歴タブ */}
      {activeTab === 'history' && (
        <div>
          {loading ? (
            <p className="text-sm text-gray-500">読み込み中...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500">該当するイベントがありません</p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.id} className="bg-white rounded-lg p-3 border shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${event.payer.colorBg} ${event.payer.colorText}`}>
                        {event.payer.initial}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{event.eventName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(event.eventDate)} / {event.payer.name}
                          {event.place && ` / ${event.place}`}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {event.participants.map((p) => (
                            <div
                              key={p.member.id}
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${p.member.colorBg} ${p.member.colorText}`}
                              title={p.member.name}
                            >
                              {p.member.initial}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="font-bold text-slate-800 shrink-0">¥{event.amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ランキングタブ */}
      {activeTab === 'ranking' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">支払額ランキング</CardTitle>
          </CardHeader>
          <CardContent>
            {rankingData.length === 0 ? (
              <p className="text-sm text-gray-500">データがありません</p>
            ) : (
              <div className="space-y-3">
                {rankingData.map((member, index) => (
                  <div key={member.name} className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-gray-100 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${member.colorBg} ${member.colorText}`}>
                      {member.initial}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.count}回</p>
                    </div>
                    <p className="font-bold text-slate-800">¥{member.total.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 統計タブ */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {!stats ? (
            <p className="text-sm text-gray-500">読み込み中...</p>
          ) : (
            <>
              {/* 基本統計 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-800">基本統計</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{stats.totalCount}</p>
                      <p className="text-xs text-gray-500">総回数</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">¥{stats.totalAmount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">累計金額</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">¥{stats.averageAmount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">平均金額</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 偏差値 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-800">男気偏差値</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.deviationScores
                      .sort((a, b) => b.score - a.score)
                      .map((m) => (
                        <div key={m.id} className="flex items-center justify-between py-1">
                          <span className="text-sm text-slate-800">{m.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">¥{m.totalPaid.toLocaleString()}</span>
                            <span className={`font-bold text-lg ${
                              m.score >= 60 ? 'text-amber-600' : m.score >= 40 ? 'text-slate-800' : 'text-gray-400'
                            }`}>
                              {m.score}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* 連勝記録 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-800">連続記録</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.streaks
                      .filter((s) => s.maxStreak > 0)
                      .sort((a, b) => b.maxStreak - a.maxStreak)
                      .map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-1">
                          <span className="text-sm text-slate-800">{s.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                              {s.currentStreak > 0 ? `現在 ${s.currentStreak}連続中` : ''}
                            </span>
                            <span className="font-bold text-slate-800">最大 {s.maxStreak}連続</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* 記録 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-800">記録</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.records.map((record) => (
                      <div key={record.label} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{record.label}</p>
                          {record.detail && <p className="text-xs text-gray-500">{record.detail}</p>}
                        </div>
                        <p className="font-bold text-slate-800">
                          {typeof record.value === 'number' && record.label.includes('額')
                            ? `¥${record.value.toLocaleString()}`
                            : record.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ヒートマップ */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-800">奢りヒートマップ</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-3">行 = 奢った人、列 = 奢られた人（回数）</p>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full">
                      <thead>
                        <tr>
                          <th className="text-left p-1"></th>
                          {stats.perMember.map((m) => (
                            <th key={m.id} className="p-1 text-center text-gray-500">{m.name.slice(0, 3)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.perMember.map((payer) => (
                          <tr key={payer.id}>
                            <td className="p-1 font-medium text-slate-800">{payer.name.slice(0, 3)}</td>
                            {stats.perMember.map((receiver) => {
                              const count = stats.heatmap[payer.id]?.[receiver.id] ?? 0;
                              return (
                                <td key={receiver.id} className="p-1 text-center">
                                  {payer.id === receiver.id ? (
                                    <span className="text-gray-300">-</span>
                                  ) : (
                                    <span className={`inline-block w-6 h-6 leading-6 rounded ${
                                      count >= 10 ? 'bg-amber-500 text-white' :
                                      count >= 5 ? 'bg-amber-200 text-amber-800' :
                                      count > 0 ? 'bg-amber-50 text-amber-700' : 'text-gray-300'
                                    }`}>
                                      {count}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
