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
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';

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
  monthlyTrend: { month: string; amount: number }[];
  heatmap: Record<string, Record<string, number>>;
  deviationScores: { id: string; name: string; totalPaid: number; score: number }[];
  streaks: { id: string; name: string; maxStreak: number; currentStreak: number }[];
  cumulativeRace: { month: string; [memberId: string]: string | number }[];
  records: { label: string; value: number | string; detail?: string }[];
};

type Tab = 'history' | 'ranking' | 'stats';

// メンバーごとの色（recharts用）
const MEMBER_COLORS = ['#d97706', '#2563eb', '#dc2626', '#059669', '#7c3aed', '#ec4899'];

// 金額フォーマット（万円表記）
function formatYen(value: number) {
  if (value >= 10000) return `${Math.round(value / 10000)}万`;
  return `¥${value.toLocaleString()}`;
}

// 月表示を短縮
function shortMonth(month: string) {
  const [, m] = month.split('-');
  return `${parseInt(m)}月`;
}

// 偏差値ラベル
function deviationLabel(score: number) {
  if (score >= 65) return '超漢気体質';
  if (score >= 55) return '漢気体質';
  if (score >= 45) return '平均';
  return 'しっかり者';
}

export default function OtokogiPage() {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [events, setEvents] = useState<OtokogiEvent[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [yearFilter, setYearFilter] = useState('all');
  const [statsYearFilter, setStatsYearFilter] = useState('all');
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
    const params = new URLSearchParams();
    if (statsYearFilter !== 'all') params.set('year', statsYearFilter);
    const res = await fetch(`/api/otokogi/stats?${params.toString()}`);
    const data = await res.json();
    setStats(data);
  }, [statsYearFilter]);

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

  // 偏差値のバーチャート用データ
  const deviationChartData = stats?.deviationScores
    .sort((a, b) => b.score - a.score)
    .map((m) => ({
      name: m.name,
      score: m.score,
      fill: m.score >= 60 ? '#d97706' : m.score >= 40 ? '#334155' : '#9ca3af',
    })) ?? [];

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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${event.payer.colorBg} ${event.payer.colorText}`}>
                        {event.payer.initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{event.eventName}</p>
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
                    <p className="font-bold text-slate-800 shrink-0 text-sm">¥{event.amount.toLocaleString()}</p>
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
                  <div key={member.name} className="flex items-center gap-2 sm:gap-3">
                    <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${
                      index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-gray-100 text-gray-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${member.colorBg} ${member.colorText}`}>
                      {member.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.count}回</p>
                    </div>
                    <p className="font-bold text-sm sm:text-base text-slate-800 shrink-0">¥{member.total.toLocaleString()}</p>
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
          {/* 年度フィルタ（統計） */}
          <div className="flex gap-2">
            <Select value={statsYearFilter} onValueChange={setStatsYearFilter}>
              <SelectTrigger className="w-auto">
                <SelectValue>{statsYearFilter === 'all' ? '全期間' : `${statsYearFilter}年`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全期間</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}年</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.totalCount}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">総回数</p>
                    </div>
                    <div>
                      <p className="text-sm sm:text-2xl font-bold text-slate-800 truncate">¥{stats.totalAmount.toLocaleString()}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">累計金額</p>
                    </div>
                    <div>
                      <p className="text-sm sm:text-2xl font-bold text-slate-800 truncate">¥{stats.averageAmount.toLocaleString()}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">平均金額</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 月別支払額推移 */}
              {stats.monthlyTrend.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-slate-800">月別支払額推移</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-48 sm:h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.monthlyTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                          <XAxis
                            dataKey="month"
                            tickFormatter={shortMonth}
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tickFormatter={formatYen}
                            tick={{ fontSize: 10 }}
                            width={40}
                          />
                          <Tooltip
                            formatter={(value) => [`¥${Number(value).toLocaleString()}`, '支払額']}
                            labelFormatter={(label) => {
                              const [y, m] = String(label).split('-');
                              return `${y}年${parseInt(m)}月`;
                            }}
                          />
                          <Bar dataKey="amount" fill="#d97706" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 男気偏差値 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-800">男気偏差値</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-44 sm:h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={deviationChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                      >
                        <XAxis type="number" domain={[0, 80]} tick={{ fontSize: 10 }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 11 }}
                          width={50}
                        />
                        <Tooltip
                          formatter={(value) => [Number(value), '偏差値']}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* ラベル */}
                  <div className="mt-2 space-y-1">
                    {deviationChartData.map((m) => (
                      <div key={m.name} className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{m.name}</span>
                        <span className={`text-xs font-medium ${
                          m.score >= 60 ? 'text-amber-600' : m.score >= 40 ? 'text-slate-600' : 'text-gray-400'
                        }`}>
                          {m.score} — {deviationLabel(m.score)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 累積支払額レース */}
              {stats.cumulativeRace.length > 0 && stats.perMember.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-slate-800">累積支払額レース</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-52 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.cumulativeRace} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="month"
                            tickFormatter={shortMonth}
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tickFormatter={formatYen}
                            tick={{ fontSize: 10 }}
                            width={40}
                          />
                          <Tooltip
                            formatter={(value, name) => {
                              const member = stats.perMember.find((m) => m.id === String(name));
                              return [`¥${Number(value).toLocaleString()}`, member?.name ?? String(name)];
                            }}
                            labelFormatter={(label) => {
                              const [y, m] = String(label).split('-');
                              return `${y}年${parseInt(m)}月`;
                            }}
                          />
                          {stats.perMember.map((member, i) => (
                            <Line
                              key={member.id}
                              type="monotone"
                              dataKey={member.id}
                              name={member.id}
                              stroke={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                              strokeWidth={2}
                              dot={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* 凡例 */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                      {stats.perMember.map((m, i) => (
                        <div key={m.id} className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length] }}
                          />
                          <span className="text-xs text-gray-600">{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 奢りヒートマップ */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-slate-800">奢りヒートマップ</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 mb-3">行 = 奢った人、列 = 奢られた人（回数）</p>
                  <div className="overflow-x-auto -mx-2">
                    <table className="text-[10px] sm:text-xs w-full min-w-0">
                      <thead>
                        <tr>
                          <th className="text-left p-0.5 sm:p-1 w-10 sm:w-14"></th>
                          {stats.perMember.map((m) => (
                            <th key={m.id} className="p-0.5 sm:p-1 text-center text-gray-500 whitespace-nowrap">
                              {m.name.slice(0, 2)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {stats.perMember.map((payer) => (
                          <tr key={payer.id}>
                            <td className="p-0.5 sm:p-1 font-medium text-slate-800 whitespace-nowrap">{payer.name.slice(0, 2)}</td>
                            {stats.perMember.map((receiver) => {
                              const count = stats.heatmap[payer.id]?.[receiver.id] ?? 0;
                              return (
                                <td key={receiver.id} className="p-0.5 sm:p-1 text-center">
                                  {payer.id === receiver.id ? (
                                    <span className="text-gray-300">-</span>
                                  ) : (
                                    <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 text-[10px] sm:text-xs rounded ${
                                      count >= 10 ? 'bg-amber-500 text-white font-bold' :
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

              {/* 連続記録 */}
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
                        <div key={s.id} className="flex items-center justify-between py-1 gap-2">
                          <span className="text-sm text-slate-800 shrink-0">{s.name}</span>
                          <div className="flex items-center gap-2 sm:gap-3 text-right">
                            <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                              {s.currentStreak > 0 ? `${s.currentStreak}連続中` : ''}
                            </span>
                            <span className="font-bold text-sm text-slate-800 whitespace-nowrap">最大{s.maxStreak}連続</span>
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
                      <div key={record.label} className="flex items-center justify-between py-2 border-b last:border-b-0 gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800">{record.label}</p>
                          {record.detail && <p className="text-xs text-gray-500 truncate">{record.detail}</p>}
                        </div>
                        <p className="font-bold text-sm text-slate-800 shrink-0">
                          {typeof record.value === 'number' && record.label.includes('額')
                            ? `¥${record.value.toLocaleString()}`
                            : record.value}
                        </p>
                      </div>
                    ))}
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
