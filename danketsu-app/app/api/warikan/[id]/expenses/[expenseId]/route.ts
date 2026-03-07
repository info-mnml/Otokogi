import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string; expenseId: string }> }

// PUT /api/warikan/[id]/expenses/[expenseId] — 立替明細更新
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id, expenseId } = await params
    const body = await request.json()
    const { payerId, description, amount } = body

    // 割り勘イベントの存在・ステータス確認
    const warikanEvent = await prisma.warikanEvent.findUnique({
      where: { id },
    })

    if (!warikanEvent) {
      return NextResponse.json(
        { error: '割り勘イベントが見つかりません' },
        { status: 404 }
      )
    }

    if (warikanEvent.status !== 'ENTERING') {
      return NextResponse.json(
        { error: '明細入力中のイベントのみ編集できます' },
        { status: 400 }
      )
    }

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json(
        { error: 'amount は0より大きい数値を指定してください' },
        { status: 400 }
      )
    }

    const expense = await prisma.warikanExpense.update({
      where: { id: expenseId },
      data: {
        ...(payerId !== undefined && { payerId }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount }),
      },
      include: { payer: true },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('立替明細更新エラー:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json(
        { error: '立替明細が見つかりません' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: '立替明細の更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/warikan/[id]/expenses/[expenseId] — 立替明細削除
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id, expenseId } = await params

    // 割り勘イベントの存在・ステータス確認
    const warikanEvent = await prisma.warikanEvent.findUnique({
      where: { id },
    })

    if (!warikanEvent) {
      return NextResponse.json(
        { error: '割り勘イベントが見つかりません' },
        { status: 404 }
      )
    }

    if (warikanEvent.status !== 'ENTERING') {
      return NextResponse.json(
        { error: '明細入力中のイベントからのみ削除できます' },
        { status: 400 }
      )
    }

    await prisma.warikanExpense.delete({
      where: { id: expenseId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('立替明細削除エラー:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json(
        { error: '立替明細が見つかりません' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: '立替明細の削除に失敗しました' },
      { status: 500 }
    )
  }
}
