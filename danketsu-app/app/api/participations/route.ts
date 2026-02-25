import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const participation = await prisma.participation.create({
      data,
    });
    return NextResponse.json(participation, { status: 201 });
  } catch (error) {
    console.error('Failed to create participation:', error);
    return NextResponse.json({ error: '参加記録の作成に失敗しました' }, { status: 500 });
  }
}
