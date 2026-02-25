// LocalStorageからMongoDBへデータを移行するスクリプト
// 実行方法: npx ts-node scripts/migrate-data.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function migrateData() {
  console.log('データ移行を開始します...');

  try {
    // LocalStorageデータをエクスポートしたJSONファイルを読み込む
    // 注意: このスクリプトを実行する前に、ブラウザからLocalStorageデータをJSONとしてエクスポートする必要があります
    if (!fs.existsSync('./localStorage-export.json')) {
      console.error('localStorage-export.json ファイルが見つかりません。');
      console.log('ブラウザから以下の手順でLocalStorageデータをエクスポートしてください:');
      console.log('1. アプリを開き、開発者ツールを表示 (F12またはCmd+Option+I)');
      console.log('2. Applicationタブ > Local Storage を選択');
      console.log('3. 各キーの値をコピーし、以下の形式のJSONファイルを作成:');
      console.log(`
{
  "events": [ ... ],
  "participants": [ ... ],
  "participations": [ ... ]
}
      `);
      console.log('4. このファイルをlocalStorage-export.jsonとして保存');
      return;
    }

    const data = JSON.parse(fs.readFileSync('./localStorage-export.json', 'utf8'));

    // 既存データがあれば、クリア
    console.log('既存データをクリアしています...');
    await prisma.participation.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.participant.deleteMany({});

    // 参加者データを移行
    console.log('参加者データを移行しています...');
    for (const participant of data.participants || []) {
      await prisma.participant.create({
        data: {
          name: participant.name,
          winCount: participant.winCount || 0,
          loseCount: participant.loseCount || 0,
          totalPaid: participant.totalPaid || 0,
          totalCollected: participant.totalCollected || 0,
        },
      });
    }

    // イベントデータを移行
    console.log('イベントデータを移行しています...');
    for (const event of data.events || []) {
      await prisma.event.create({
        data: {
          name: event.name,
          date: new Date(event.date),
          location: event.location,
          description: event.description,
          totalAmount: event.totalAmount || 0,
        },
      });
    }

    // 参加記録データを移行
    console.log('参加記録データを移行しています...');
    for (const participation of data.participations || []) {
      // イベントIDと参加者IDを検索
      const event = await prisma.event.findFirst({
        where: { name: participation.eventName },
      });

      const participant = await prisma.participant.findFirst({
        where: { name: participation.participantName },
      });

      if (event && participant) {
        await prisma.participation.create({
          data: {
            eventId: event.id,
            participantId: participant.id,
            isWinner: participation.isWinner,
            amountPaid: participation.amountPaid || 0,
            amountCollected: participation.amountCollected || 0,
            jankenChoiceWinner: participation.jankenChoiceWinner,
            jankenChoiceLoser: participation.jankenChoiceLoser,
          },
        });
      }
    }

    console.log('データ移行が完了しました！');
  } catch (error) {
    console.error('データ移行中にエラーが発生しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateData();
