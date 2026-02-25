import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const participant = await prisma.participant.findUnique({
      where: {
        id: params.id,
      },
      include: {
        participations: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: '参加者が見つかりません' }, { status: 404 });
    }

    // 拡張統計情報を計算
    const totalEvents = participant.participations.length;
    const winRate = participant.winCount > 0 
      ? participant.winCount / (participant.winCount + participant.loseCount) 
      : 0;
    const netBalance = participant.totalCollected - participant.totalPaid;

    return NextResponse.json({
      ...participant,
      winRate,
      totalEvents,
      netBalance,
    });
  } catch (error) {
    console.error('Failed to fetch participant:', error);
    return NextResponse.json({ error: '参加者の取得に失敗しました' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const data = await request.json();
    const participant = await prisma.participant.update({
      where: {
        id: params.id,
      },
      data,
    });
    return NextResponse.json(participant);
  } catch (error) {
    console.error('Failed to update participant:', error);
    return NextResponse.json({ error: '参加者の更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // 関連する参加記録も削除
    await prisma.participation.deleteMany({
      where: {
        participantId: params.id,
      },
    });

    await prisma.participant.delete({
      where: {
        id: params.id,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete participant:', error);
    return NextResponse.json({ error: '参加者の削除に失敗しました' }, { status: 500 });
  }
}
