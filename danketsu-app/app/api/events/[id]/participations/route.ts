import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const participations = await prisma.participation.findMany({
      where: {
        eventId: params.id,
      },
      include: {
        participant: true,
      },
    });
    return NextResponse.json(participations);
  } catch (error) {
    console.error('Failed to fetch participations:', error);
    return NextResponse.json({ error: '参加記録の取得に失敗しました' }, { status: 500 });
  }
}
