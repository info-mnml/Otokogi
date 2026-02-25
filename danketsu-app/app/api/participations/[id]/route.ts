import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const data = await request.json();
    const participation = await prisma.participation.update({
      where: {
        id: params.id,
      },
      data,
    });
    return NextResponse.json(participation);
  } catch (error) {
    console.error('Failed to update participation:', error);
    return NextResponse.json({ error: '参加記録の更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    await prisma.participation.delete({
      where: {
        id: params.id,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete participation:', error);
    return NextResponse.json({ error: '参加記録の削除に失敗しました' }, { status: 500 });
  }
}
