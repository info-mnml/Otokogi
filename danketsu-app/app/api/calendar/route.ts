import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// イベント名から日付をパース（例: "20260207_テニス" → "2026-02-07"）
function parseEventDate(eventName: string): string | null {
  // YYYYMMDD パターン
  const match = eventName.match(/^(\d{4})(\d{2})(\d{2})/)
  if (match) {
    const [, y, m, d] = match
    return `${y}-${m}-${d}`
  }
  return null
}

// GET /api/calendar?year=2026&month=3 — 月のカレンダーデータ（イベント + 男気 + 割り勘）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year') ?? String(new Date().getFullYear())
    const month = searchParams.get('month') ?? String(new Date().getMonth() + 1)

    const startDate = new Date(`${year}-${month.padStart(2, '0')}-01`)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    const startStr = `${year}-${month.padStart(2, '0')}-01`
    const endYear = endDate.getFullYear()
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0')
    const endStr = `${endYear}-${endMonth}-01`

    // 3種類のデータを並行取得
    const [events, otokogiEvents, allWarikanEvents] = await Promise.all([
      // カレンダーイベント
      prisma.event.findMany({
        where: {
          OR: [
            { date: { gte: startDate, lt: endDate } },
            { endDate: { gte: startDate, lt: endDate } },
            { AND: [{ date: { lt: startDate } }, { endDate: { gte: endDate } }] },
          ],
        },
        include: {
          createdBy: true,
          participants: { include: { member: true } },
        },
        orderBy: { date: 'asc' },
      }),

      // 男気イベント
      prisma.otokogiEvent.findMany({
        where: {
          eventDate: { gte: startDate, lt: endDate },
        },
        include: {
          payer: true,
          participants: { include: { member: true } },
        },
        orderBy: { eventDate: 'asc' },
      }),

      // 割り勘イベント（全件取得してイベント名から日付フィルタ）
      // paymentDeadlineがこの月内のもの、またはイベント名に日付が含まれるもの
      prisma.warikanEvent.findMany({
        include: {
          manager: true,
          participants: { include: { member: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    // 割り勘イベントにイベント名から推定した日付を付与してフィルタ
    const warikanEvents = allWarikanEvents
      .map((w) => {
        // イベント名からパース → paymentDeadline → detailDeadline の優先順
        const parsedDate = parseEventDate(w.eventName)
        const displayDate = parsedDate
          ?? (w.paymentDeadline ? w.paymentDeadline.toISOString().slice(0, 10) : null)
          ?? (w.detailDeadline ? w.detailDeadline.toISOString().slice(0, 10) : null)
        return { ...w, displayDate }
      })
      .filter((w) => {
        if (!w.displayDate) return false
        return w.displayDate >= startStr && w.displayDate < endStr
      })

    return NextResponse.json({ events, otokogiEvents, warikanEvents })
  } catch (error) {
    console.error('カレンダーデータ取得エラー:', error)
    return NextResponse.json({ error: 'カレンダーデータの取得に失敗しました' }, { status: 500 })
  }
}
