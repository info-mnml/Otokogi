"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { getParticipants } from "@/lib/utils/participants";
import { Participant } from "@/types";

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    setParticipants(getParticipants());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">参加者一覧</h1>
        <Button asChild>
          <Link href="/participants/new">新規参加者</Link>
        </Button>
      </div>
      {participants.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {participants.map((participant) => (
            <Card key={participant.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">{participant.name}</h2>
                    <p className="text-sm text-gray-500">
                      勝率: {participant.winCount > 0 
                        ? ((participant.winCount / (participant.winCount + participant.lossCount)) * 100).toFixed(1) 
                        : 0}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">参加回数: {participant.totalParticipation}回</p>
                    <p className={`font-medium ${participant.totalPaid - participant.totalExpected >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {participant.totalPaid - participant.totalExpected >= 0 ? '+' : ''}
                      ¥{Math.abs(participant.totalPaid - participant.totalExpected).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center py-8 text-gray-500">参加者はまだいません</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
