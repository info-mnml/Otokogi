import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// じゃんけん結果を追加
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { participantId, isWinner, paidAmount } = body;
    
    // イベントの所有者を確認
    const event = await prisma.event.findUnique({
      where: {
        id: params.id,
      },
    });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    if (event.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // 参加者が既にこのイベントに参加しているか確認
    const existingParticipation = await prisma.participation.findFirst({
      where: {
        eventId: params.id,
        participantId,
      },
    });
    
    let participation;
    
    if (existingParticipation) {
      // 既存の参加記録を更新
      participation = await prisma.participation.update({
        where: {
          id: existingParticipation.id,
        },
        data: {
          isWinner,
          paidAmount: parseFloat(paidAmount.toString()),
        },
      });
    } else {
      // 新しい参加記録を作成
      participation = await prisma.participation.create({
        data: {
          eventId: params.id,
          participantId,
          isWinner,
          paidAmount: parseFloat(paidAmount.toString()),
        },
      });
    }
    
    // イベントの総額を更新
    const totalAmount = await prisma.participation.aggregate({
      where: {
        eventId: params.id,
      },
      _sum: {
        paidAmount: true,
      },
    });
    
    await prisma.event.update({
      where: {
        id: params.id,
      },
      data: {
        totalAmount: totalAmount._sum.paidAmount || 0,
      },
    });
    
    return NextResponse.json(participation, { status: 201 });
  } catch (error) {
    console.error('Error recording janken result:', error);
    return NextResponse.json({ error: 'Failed to record janken result' }, { status: 500 });
  }
}
