import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// GET /api/warikan/[id]/settlements — 精算結果一覧
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const settlements = await prisma.warikanSettlement.findMany({
      where: { warikanEventId: id },
      include: {
        fromMember: true,
        toMember: true,
      },
      orderBy: { amount: 'desc' },
    })

    return NextResponse.json(settlements)
  } catch (error) {
    console.error('精算結果一覧取得エラー:', error)
    return NextResponse.json(
      { error: '精算結果一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST /api/warikan/[id]/settlements — 精算計算・Settlement レコード生成
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params

    // 割り勘イベント取得（参加者・立替明細含む）
    const warikanEvent = await prisma.warikanEvent.findUnique({
      where: { id },
      include: {
        participants: true,
        expenses: true,
      },
    })

    if (!warikanEvent) {
      return NextResponse.json(
        { error: '割り勘イベントが見つかりません' },
        { status: 404 }
      )
    }

    if (warikanEvent.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'クローズ済みのイベントは再精算できません' },
        { status: 400 }
      )
    }

    if (warikanEvent.expenses.length === 0) {
      return NextResponse.json(
        { error: '立替明細がありません' },
        { status: 400 }
      )
    }

    if (warikanEvent.participants.length === 0) {
      return NextResponse.json(
        { error: '参加者がいません' },
        { status: 400 }
      )
    }

    const participantIds = warikanEvent.participants.map((p) => p.memberId)
    const participantCount = participantIds.length

    // 各メンバーの支払合計を計算
    const paidByMember: Record<string, number> = {}
    for (const memberId of participantIds) {
      paidByMember[memberId] = 0
    }
    for (const expense of warikanEvent.expenses) {
      if (paidByMember[expense.payerId] !== undefined) {
        paidByMember[expense.payerId] += expense.amount
      }
    }

    // 合計額と一人あたりの負担額
    const totalAmount = warikanEvent.expenses.reduce((sum, e) => sum + e.amount, 0)
    const sharePerPerson = totalAmount / participantCount

    // 各メンバーの収支（支払額 - 負担額）
    // プラス = 立替超過（受け取る側）、マイナス = 不足（支払う側）
    const balances: { memberId: string; balance: number }[] = participantIds.map(
      (memberId) => ({
        memberId,
        balance: paidByMember[memberId] - sharePerPerson,
      })
    )

    // 貪欲法で最適な送金フローを計算
    // 債権者（balance > 0）と債務者（balance < 0）に分ける
    const creditors = balances
      .filter((b) => b.balance > 0)
      .sort((a, b) => b.balance - a.balance) // 大きい順
    const debtors = balances
      .filter((b) => b.balance < 0)
      .sort((a, b) => a.balance - b.balance) // 小さい順（負債が大きい順）

    const settlements: { fromMemberId: string; toMemberId: string; amount: number }[] = []

    let ci = 0
    let di = 0

    while (ci < creditors.length && di < debtors.length) {
      const credit = creditors[ci].balance
      const debt = -debtors[di].balance // 正の値に変換

      const transferAmount = Math.min(credit, debt)
      // 1円未満は切り捨て
      const roundedAmount = Math.floor(transferAmount)

      if (roundedAmount > 0) {
        settlements.push({
          fromMemberId: debtors[di].memberId,
          toMemberId: creditors[ci].memberId,
          amount: roundedAmount,
        })
      }

      creditors[ci].balance -= transferAmount
      debtors[di].balance += transferAmount

      if (creditors[ci].balance < 1) ci++
      if (debtors[di].balance > -1) di++
    }

    // トランザクションで既存Settlementを削除して新規作成 + ステータス更新
    const result = await prisma.$transaction(async (tx) => {
      // 既存の精算結果を削除
      await tx.warikanSettlement.deleteMany({
        where: { warikanEventId: id },
      })

      // 新規精算結果を作成
      for (const s of settlements) {
        await tx.warikanSettlement.create({
          data: {
            warikanEventId: id,
            fromMemberId: s.fromMemberId,
            toMemberId: s.toMemberId,
            amount: s.amount,
          },
        })
      }

      // ステータスを PAYING に更新
      return tx.warikanEvent.update({
        where: { id },
        data: { status: 'PAYING' },
        include: {
          manager: true,
          participants: {
            include: { member: true },
          },
          expenses: {
            include: { payer: true },
          },
          settlements: {
            include: { fromMember: true, toMember: true },
            orderBy: { amount: 'desc' },
          },
        },
      })
    })

    return NextResponse.json({
      ...result,
      summary: {
        totalAmount,
        sharePerPerson: Math.round(sharePerPerson),
        settlementCount: settlements.length,
      },
    })
  } catch (error) {
    console.error('精算計算エラー:', error)
    return NextResponse.json(
      { error: '精算計算に失敗しました' },
      { status: 500 }
    )
  }
}
