import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { winnerId, loserId, winnerChoice, loserChoice, amount } = await request.json();
    const eventId = params.id;

    // トランザクションを使用して一貫性を保証
    await prisma.$transaction(async (tx) => {
      // 勝者の参加記録を更新/作成
      const winnerParticipation = await tx.participation.upsert({
        where: {
          id: `${eventId}_${winnerId}`,
        },
        update: {
          isWinner: true,
          amountCollected: { increment: amount },
          jankenChoiceWinner: winnerChoice,
        },
        create: {
          eventId,
          participantId: winnerId,
          isWinner: true,
          amountCollected: amount,
          amountPaid: 0,
          jankenChoiceWinner: winnerChoice,
        },
      });

      // 敗者の参加記録を更新/作成
      const loserParticipation = await tx.participation.upsert({
        where: {
          id: `${eventId}_${loserId}`,
        },
        update: {
          isWinner: false,
          amountPaid: { increment: amount },
          jankenChoiceLoser: loserChoice,
        },
        create: {
          eventId,
          participantId: loserId,
          isWinner: false,
          amountPaid: amount,
          amountCollected: 0,
          jankenChoiceLoser: loserChoice,
        },
      });

      // 勝者の統計を更新
      await tx.participant.update({
        where: { id: winnerId },
        data: {
          winCount: { increment: 1 },
          totalCollected: { increment: amount },
        },
      });

      // 敗者の統計を更新
      await tx.participant.update({
        where: { id: loserId },
        data: {
          loseCount: { increment: 1 },
          totalPaid: { increment: amount },
        },
      });

      // イベントの支払総額を更新
      await tx.event.update({
        where: { id: eventId },
        data: {
          totalAmount: { increment: amount },
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Failed to record janken result:', error);
    return NextResponse.json({ error: 'じゃんけん結果の記録に失敗しました' }, { status: 500 });
  }
}
