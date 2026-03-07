import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/otokogi/stats — 男気統計情報
export async function GET() {
  try {
    const [events, members] = await Promise.all([
      prisma.otokogiEvent.findMany({
        include: {
          payer: true,
          participants: {
            include: { member: true },
          },
        },
        orderBy: { eventDate: 'asc' },
      }),
      prisma.member.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
    ])

    // --- 基本統計 ---
    const totalCount = events.length
    const totalAmount = events.reduce((sum, e) => sum + e.amount, 0)
    const averageAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0

    // --- メンバー別統計 ---
    const perMember = members.map((member) => {
      const paidEvents = events.filter((e) => e.payerId === member.id)
      const participatedEvents = events.filter((e) =>
        e.participants.some((p) => p.memberId === member.id)
      )

      const count = paidEvents.length
      const participated = participatedEvents.length
      const totalPaid = paidEvents.reduce((sum, e) => sum + e.amount, 0)
      const winRate = participated > 0 ? Math.round((count / participated) * 100) : 0

      return {
        id: member.id,
        name: member.name,
        count,
        participated,
        totalPaid,
        winRate,
      }
    })

    // --- 月別トレンド ---
    const monthlyMap = new Map<string, number>()
    for (const event of events) {
      const d = new Date(event.eventDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + event.amount)
    }
    const monthlyTrend = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }))

    // --- ヒートマップ（誰が誰におごったか） ---
    const heatmap: Record<string, Record<string, number>> = {}
    for (const member of members) {
      heatmap[member.id] = {}
      for (const other of members) {
        heatmap[member.id][other.id] = 0
      }
    }
    for (const event of events) {
      for (const participant of event.participants) {
        if (participant.memberId !== event.payerId) {
          if (heatmap[event.payerId]?.[participant.memberId] !== undefined) {
            heatmap[event.payerId][participant.memberId]++
          }
        }
      }
    }

    // --- 漢気偏差値 ---
    const paidAmounts = perMember.map((m) => m.totalPaid)
    const mean = paidAmounts.length > 0
      ? paidAmounts.reduce((s, v) => s + v, 0) / paidAmounts.length
      : 0
    const variance = paidAmounts.length > 0
      ? paidAmounts.reduce((s, v) => s + (v - mean) ** 2, 0) / paidAmounts.length
      : 0
    const stdDev = Math.sqrt(variance)

    const deviationScores = perMember.map((m) => ({
      id: m.id,
      name: m.name,
      totalPaid: m.totalPaid,
      score: stdDev > 0 ? Math.round(((m.totalPaid - mean) / stdDev) * 10 + 50) : 50,
    }))

    // --- 連勝・連敗（同じ人が連続で支払った回数） ---
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    )
    const streaks: { id: string; name: string; maxStreak: number; currentStreak: number }[] = []

    for (const member of members) {
      let maxStreak = 0
      let currentStreak = 0
      let lastWasPayer = false

      for (const event of sortedEvents) {
        const isParticipant = event.participants.some((p) => p.memberId === member.id)
        if (!isParticipant) continue

        if (event.payerId === member.id) {
          currentStreak++
          lastWasPayer = true
          if (currentStreak > maxStreak) maxStreak = currentStreak
        } else {
          if (lastWasPayer) currentStreak = 0
          lastWasPayer = false
        }
      }

      streaks.push({
        id: member.id,
        name: member.name,
        maxStreak,
        currentStreak: lastWasPayer ? currentStreak : 0,
      })
    }

    // --- 累積支払額レース（月別） ---
    const cumulativeRace: { month: string; [memberId: string]: string | number }[] = []
    const cumulative: Record<string, number> = {}
    for (const member of members) {
      cumulative[member.id] = 0
    }

    for (const { month } of monthlyTrend) {
      const monthEvents = events.filter((e) => {
        const d = new Date(e.eventDate)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        return key === month
      })

      for (const event of monthEvents) {
        if (cumulative[event.payerId] !== undefined) {
          cumulative[event.payerId] += event.amount
        }
      }

      const entry: { month: string; [memberId: string]: string | number } = { month }
      for (const member of members) {
        entry[member.id] = cumulative[member.id]
      }
      cumulativeRace.push(entry)
    }

    // --- 記録 ---
    const records: { label: string; value: number | string; detail?: string }[] = []

    if (events.length > 0) {
      // 最高額
      const maxEvent = events.reduce((max, e) => (e.amount > max.amount ? e : max))
      records.push({
        label: '最高額',
        value: maxEvent.amount,
        detail: `${maxEvent.payer.name} - ${maxEvent.eventName}`,
      })

      // 最低額
      const minEvent = events.reduce((min, e) => (e.amount < min.amount ? e : min))
      records.push({
        label: '最低額',
        value: minEvent.amount,
        detail: `${minEvent.payer.name} - ${minEvent.eventName}`,
      })

      // 1日最多回数
      const dayCountMap = new Map<string, number>()
      for (const event of events) {
        const dayKey = new Date(event.eventDate).toISOString().slice(0, 10)
        dayCountMap.set(dayKey, (dayCountMap.get(dayKey) ?? 0) + 1)
      }
      const maxDayEntry = Array.from(dayCountMap.entries()).reduce((max, e) =>
        e[1] > max[1] ? e : max
      )
      records.push({
        label: '1日最多回数',
        value: maxDayEntry[1],
        detail: maxDayEntry[0],
      })

      // 最多参加人数
      const maxParticipants = events.reduce((max, e) =>
        e.participants.length > max.participants.length ? e : max
      )
      records.push({
        label: '最多参加人数',
        value: maxParticipants.participants.length,
        detail: `${maxParticipants.payer.name} - ${maxParticipants.eventName}`,
      })
    }

    return NextResponse.json({
      totalCount,
      totalAmount,
      averageAmount,
      perMember,
      monthlyTrend,
      heatmap,
      deviationScores,
      streaks,
      cumulativeRace,
      records,
    })
  } catch (error) {
    console.error('統計情報取得エラー:', error)
    return NextResponse.json(
      { error: '統計情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
