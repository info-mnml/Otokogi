#!/bin/bash

# 色の設定
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}男気じゃんけん管理アプリ MongoDB + Prisma セットアップスクリプト${NC}"
echo "======================================================"

# 必要なパッケージのインストール
echo -e "${GREEN}1. 必要なパッケージをインストールしています...${NC}"
npm install prisma @prisma/client mongodb next-auth @auth/prisma-adapter bcryptjs
npm install -D ts-node @types/bcryptjs

# Prismaの初期化
echo -e "${GREEN}2. Prismaを初期化しています...${NC}"
npx prisma init

# ディレクトリ作成
echo -e "${GREEN}3. 必要なディレクトリを作成しています...${NC}"
mkdir -p app/api/events/{[id]/janken,new}
mkdir -p app/api/participants
mkdir -p app/api/migrate
mkdir -p components/migrate
mkdir -p lib/{hooks,utils}

# Prismaスキーマの作成
echo -e "${GREEN}4. Prismaスキーマを作成しています...${NC}"
cat > prisma/schema.prisma << 'EOF'
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(auto()) @map("_id") @db.ObjectId
  name          String
  email         String         @unique
  password      String?        // オプション: NextAuth.jsで使用する場合は必要
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  participants  Participant[]
  events        Event[]
}

model Participant {
  id             String          @id @default(auto()) @map("_id") @db.ObjectId
  name           String
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  user           User            @relation(fields: [userId], references: [id])
  userId         String          @db.ObjectId
  participations Participation[]

  @@index([userId])
}

model Event {
  id             String          @id @default(auto()) @map("_id") @db.ObjectId
  name           String
  date           DateTime
  location       String?
  description    String?
  totalAmount    Float           @default(0)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  user           User            @relation(fields: [userId], references: [id])
  userId         String          @db.ObjectId
  participations Participation[]

  @@index([userId])
}

model Participation {
  id            String      @id @default(auto()) @map("_id") @db.ObjectId
  event         Event       @relation(fields: [eventId], references: [id])
  eventId       String      @db.ObjectId
  participant   Participant @relation(fields: [participantId], references: [id])
  participantId String      @db.ObjectId
  isWinner      Boolean     @default(false)
  paidAmount    Float       @default(0)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([eventId])
  @@index([participantId])
}
EOF

# Prisma クライアントの設定
echo -e "${GREEN}5. Prismaクライアントを設定しています...${NC}"
cat > lib/prisma.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

// PrismaClientはグローバル変数として保持し、ホットリロード時に複数のインスタンスが作成されないようにする
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
EOF

# NextAuth設定ファイルの作成
echo -e "${GREEN}6. NextAuth設定ファイルを作成しています...${NC}"
cat > lib/auth.ts << 'EOF'
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default authOptions;
EOF

# API用ヘルパーフックの作成
echo -e "${GREEN}7. API用ヘルパーフックを作成しています...${NC}"
cat > lib/hooks/useApi.ts << 'EOF'
import { useState, useCallback } from 'react';

interface ApiOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: T;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useApi() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  const execute = useCallback(async <T>({
    url,
    method = 'GET',
    body,
    onSuccess,
    onError,
  }: ApiOptions<T>) => {
    setLoading(true);
    setError(null);

    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'API request failed');
      }

      setData(responseData);
      onSuccess?.(responseData);
      return responseData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, data, execute };
}

// 特定のAPIエンドポイント用のフックを作成
export function useEventsApi() {
  const api = useApi();

  const getEvents = useCallback(() => {
    return api.execute({
      url: '/api/events',
    });
  }, [api]);

  const getEvent = useCallback((id: string) => {
    return api.execute({
      url: `/api/events/${id}`,
    });
  }, [api]);

  const createEvent = useCallback((eventData: any) => {
    return api.execute({
      url: '/api/events',
      method: 'POST',
      body: eventData,
    });
  }, [api]);

  const updateEvent = useCallback((id: string, eventData: any) => {
    return api.execute({
      url: `/api/events/${id}`,
      method: 'PUT',
      body: eventData,
    });
  }, [api]);

  const deleteEvent = useCallback((id: string) => {
    return api.execute({
      url: `/api/events/${id}`,
      method: 'DELETE',
    });
  }, [api]);

  const addJankenResult = useCallback((eventId: string, resultData: any) => {
    return api.execute({
      url: `/api/events/${eventId}/janken`,
      method: 'POST',
      body: resultData,
    });
  }, [api]);

  return {
    ...api,
    getEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    addJankenResult,
  };
}

export function useParticipantsApi() {
  const api = useApi();

  const getParticipants = useCallback(() => {
    return api.execute({
      url: '/api/participants',
    });
  }, [api]);

  const createParticipant = useCallback((participantData: any) => {
    return api.execute({
      url: '/api/participants',
      method: 'POST',
      body: participantData,
    });
  }, [api]);

  const updateParticipant = useCallback((id: string, participantData: any) => {
    return api.execute({
      url: `/api/participants/${id}`,
      method: 'PUT',
      body: participantData,
    });
  }, [api]);

  const deleteParticipant = useCallback((id: string) => {
    return api.execute({
      url: `/api/participants/${id}`,
      method: 'DELETE',
    });
  }, [api]);

  return {
    ...api,
    getParticipants,
    createParticipant,
    updateParticipant,
    deleteParticipant,
  };
}

export function useStatsApi() {
  const api = useApi();

  const getStats = useCallback(() => {
    return api.execute({
      url: '/api/stats',
    });
  }, [api]);

  return {
    ...api,
    getStats,
  };
}
EOF

# データ移行ユーティリティの作成
echo -e "${GREEN}8. データ移行ユーティリティを作成しています...${NC}"
cat > lib/utils/migrate.ts << 'EOF'
import prisma from '@/lib/prisma';

interface LocalEvent {
  id: string;
  name: string;
  date: string;
  location?: string;
  description?: string;
  totalAmount: number;
}

interface LocalParticipant {
  id: string;
  name: string;
}

interface LocalParticipation {
  id: string;
  eventId: string;
  participantId: string;
  isWinner: boolean;
  paidAmount: number;
}

/**
 * LocalStorageからMongoDBへデータを移行するユーティリティ関数
 */
export async function migrateLocalDataToMongoDB(userId: string) {
  try {
    // ブラウザ環境でのみ実行
    if (typeof window === 'undefined') {
      return { success: false, error: 'Can only be executed in browser environment' };
    }

    // LocalStorageからデータを取得
    const localEvents = JSON.parse(localStorage.getItem('events') || '[]') as LocalEvent[];
    const localParticipants = JSON.parse(localStorage.getItem('participants') || '[]') as LocalParticipant[];
    const localParticipations = JSON.parse(localStorage.getItem('participations') || '[]') as LocalParticipation[];

    // 参加者データの移行
    const participantIdMap = new Map<string, string>();
    for (const localParticipant of localParticipants) {
      const newParticipant = await prisma.participant.create({
        data: {
          name: localParticipant.name,
          userId,
        },
      });
      participantIdMap.set(localParticipant.id, newParticipant.id);
    }

    // イベントデータの移行
    const eventIdMap = new Map<string, string>();
    for (const localEvent of localEvents) {
      const newEvent = await prisma.event.create({
        data: {
          name: localEvent.name,
          date: new Date(localEvent.date),
          location: localEvent.location,
          description: localEvent.description,
          totalAmount: localEvent.totalAmount,
          userId,
        },
      });
      eventIdMap.set(localEvent.id, newEvent.id);
    }

    // 参加記録データの移行
    for (const localParticipation of localParticipations) {
      const newEventId = eventIdMap.get(localParticipation.eventId);
      const newParticipantId = participantIdMap.get(localParticipation.participantId);

      if (newEventId && newParticipantId) {
        await prisma.participation.create({
          data: {
            eventId: newEventId,
            participantId: newParticipantId,
            isWinner: localParticipation.isWinner,
            paidAmount: localParticipation.paidAmount,
          },
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error migrating data:', error);
    return { success: false, error: 'Failed to migrate data' };
  }
}
EOF

# イベントAPIルートの作成
echo -e "${GREEN}9. イベントAPIルートを作成しています...${NC}"
cat > app/api/events/route.ts << 'EOF'
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// イベント一覧を取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const events = await prisma.event.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        participations: {
          include: {
            participant: true,
          },
        },
      },
    });
    
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// 新しいイベントを作成
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, date, location, description } = body;
    
    const newEvent = await prisma.event.create({
      data: {
        name,
        date: new Date(date),
        location,
        description,
        userId: session.user.id,
      },
    });
    
    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
EOF

# イベント詳細APIルートの作成
echo -e "${GREEN}10. イベント詳細APIルートを作成しています...${NC}"
mkdir -p app/api/events/\[id\]
cat > app/api/events/\[id\]/route.ts << 'EOF'
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// 特定のイベントを取得
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    if (event.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

// イベントを更新
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, date, location, description, totalAmount } = body;
    
    // 更新前にイベントの所有者を確認
    const existingEvent = await prisma.event.findUnique({
      where: {
        id: params.id,
      },
    });
    
    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    if (existingEvent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const updatedEvent = await prisma.event.update({
      where: {
        id: params.id,
      },
      data: {
        name,
        date: new Date(date),
        location,
        description,
        totalAmount: totalAmount || 0,
      },
    });
    
    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// イベントを削除
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 削除前にイベントの所有者を確認
    const existingEvent = await prisma.event.findUnique({
      where: {
        id: params.id,
      },
    });
    
    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    if (existingEvent.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // 関連する参加記録を先に削除
    await prisma.participation.deleteMany({
      where: {
        eventId: params.id,
      },
    });
    
    // イベントを削除
    await prisma.event.delete({
      where: {
        id: params.id,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
EOF

# じゃんけん結果APIルートの作成
echo -e "${GREEN}11. じゃんけん結果APIルートを作成しています...${NC}"
mkdir -p app/api/events/\[id\]/janken
cat > app/api/events/\[id\]/janken/route.ts << 'EOF'
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
EOF

# 参加者APIルートの作成
echo -e "${GREEN}12. 参加者APIルートを作成しています...${NC}"
cat > app/api/participants/route.ts << 'EOF'
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// 参加者一覧を取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const participants = await prisma.participant.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        participations: true,
      },
    });
    
    return NextResponse.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
  }
}

// 新しい参加者を作成
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { name } = body;
    
    const newParticipant = await prisma.participant.create({
      data: {
        name,
        userId: session.user.id,
      },
    });
    
    return NextResponse.json(newParticipant, { status: 201 });
  } catch (error) {
    console.error('Error creating participant:', error);
    return NextResponse.json({ error: 'Failed to create participant' }, { status: 500 });
  }
}
EOF

# データ移行APIルートの作成
echo -e "${GREEN}13. データ移行APIルートを作成しています...${NC}"
cat > app/api/migrate/route.ts << 'EOF'
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
EOF

# データ移行用コンポーネントの作成
echo -e "${GREEN}14. データ移行用コンポーネントを作成しています...${NC}"
cat > components/migrate/MigrateDataDialog.tsx << 'EOF'
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export function MigrateDataDialog() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    stats?: {
      participantsCount: number;
      eventsCount: number;
      participationsCount: number;
    };
    error?: string;
  } | null>(null);

  const handleMigrate = async () => {
    try {
      setLoading(true);
      setResult(null);

      // LocalStorageからデータを取得
      const events = JSON.parse(localStorage.getItem('events') || '[]');
      const participants = JSON.parse(localStorage.getItem('participants') || '[]');
      const participations = JSON.parse(localStorage.getItem('participations') || '[]');

      // APIを呼び出してデータ移行を実行
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          participants,
          participations,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '移行処理に失敗しました');
      }

      setResult({
        success: true,
        message: 'データ移行が完了しました',
        stats: data.stats,
      });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">データベース移行</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>データベース移行</DialogTitle>
          <DialogDescription>
            ローカルに保存されているデータをクラウドデータベースに移行します。
            この処理は元に戻せないため、注意して実行してください。
          </DialogDescription>
        </DialogHeader>

        {result?.success && (
          <Alert className="bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>成功</AlertTitle>
            <AlertDescription>
              {result.message}
              {result.stats && (
                <div className="mt-2 text-sm">
                  <p>移行されたデータ:</p>
                  <ul className="list-disc list-inside">
                    <li>参加者: {result.stats.participantsCount}人</li>
                    <li>イベント: {result.stats.eventsCount}件</li>
                    <li>参加記録: {result.stats.participationsCount}件</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {result?.success === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={loading || result?.success}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                移行中...
              </>
            ) : (
              '移行を実行'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
