import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const event = await prisma.event.findUnique({
      where: {
        id: params.id,
      },
      include: {
        participations: {
          include: {
            participant: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'イベントが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return NextResponse.json({ error: 'イベントの取得に失敗しました' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const data = await request.json();
    const event = await prisma.event.update({
      where: {
        id: params.id,
      },
      data,
    });
    return NextResponse.json(event);
  } catch (error) {
    console.error('Failed to update event:', error);
    return NextResponse.json({ error: 'イベントの更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // 関連する参加記録も削除
    await prisma.participation.deleteMany({
      where: {
        eventId: params.id,
      },
    });

    await prisma.event.delete({
      where: {
        id: params.id,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete event:', error);
    return NextResponse.json({ error: 'イベントの削除に失敗しました' }, { status: 500 });
  }
}
