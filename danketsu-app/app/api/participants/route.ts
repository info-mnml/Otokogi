import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    const participants = await prisma.participant.findMany();
    return NextResponse.json(participants);
  } catch (error) {
    console.error('Failed to fetch participants:', error);
    return NextResponse.json({ error: '参加者の取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const participant = await prisma.participant.create({
      data,
    });
    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    console.error('Failed to create participant:', error);
    return NextResponse.json({ error: '参加者の作成に失敗しました' }, { status: 500 });
  }
}
