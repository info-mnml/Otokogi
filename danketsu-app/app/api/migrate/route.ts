import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { events, participants, participations } = body;
    
    // トランザクションを使用してデータ移行を行う
    const result = await prisma.$transaction(async (tx) => {
      // 参加者データの移行
      const participantIdMap = new Map<string, string>();
      for (const localParticipant of participants) {
        const newParticipant = await tx.participant.create({
          data: {
            name: localParticipant.name,
            userId: session.user.id,
          },
        });
        participantIdMap.set(localParticipant.id, newParticipant.id);
      }
      
      // イベントデータの移行
      const eventIdMap = new Map<string, string>();
      for (const localEvent of events) {
        const newEvent = await tx.event.create({
          data: {
            name: localEvent.name,
            date: new Date(localEvent.date),
            location: localEvent.location,
            description: localEvent.description,
            totalAmount: localEvent.totalAmount || 0,
            userId: session.user.id,
          },
        });
        eventIdMap.set(localEvent.id, newEvent.id);
      }
      
      // 参加記録データの移行
      for (const localParticipation of participations) {
        const newEventId = eventIdMap.get(localParticipation.eventId);
        const newParticipantId = participantIdMap.get(localParticipation.participantId);
        
        if (newEventId && newParticipantId) {
          await tx.participation.create({
            data: {
              eventId: newEventId,
              participantId: newParticipantId,
              isWinner: localParticipation.isWinner,
              paidAmount: localParticipation.paidAmount || 0,
            },
          });
        }
      }
      
      return {
        participantsCount: participants.length,
        eventsCount: events.length,
        participationsCount: participations.length,
      };
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Data migration completed successfully',
      stats: result
    });
  } catch (error) {
    console.error('Error migrating data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to migrate data' 
    }, { status: 500 });
  }
}
