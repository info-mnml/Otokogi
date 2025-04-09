"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Event } from "@/types";
import { getEvent } from "@/lib/utils/events";
import { hasJankenResult } from "@/lib/utils/participations";
import { JankenForm } from "@/components/events/janken-form";

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasResult, setHasResult] = useState(false);
  
  useEffect(() => {
    const fetchEvent = () => {
      // useParamsから取得したIDを使用
      const foundEvent = getEvent(eventId);
      if (foundEvent) {
        setEvent(foundEvent);
        // じゃんけん結果があるか確認（実際のデータに基づいて判断）
        setHasResult(hasJankenResult(foundEvent.id));
      }
      setLoading(false);
    };
    
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (!event) {
    return <div className="text-center py-8">イベントが見つかりませんでした</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
        <Button variant="outline" onClick={() => router.back()}>
          戻る
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-sm font-medium text-gray-500">日付</h2>
              <p className="text-lg">{format(parseISO(event.date), "yyyy/MM/dd")}</p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-500">場所</h2>
              <p className="text-lg">{event.venue}</p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-500">支払総額</h2>
              <p className="text-lg">¥{event.totalAmount.toLocaleString()}</p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-500">じゃんけん結果</h2>
              <p className="text-lg">{hasResult ? "登録済み" : "未登録"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>じゃんけん結果登録</CardTitle>
        </CardHeader>
        <CardContent>
          <JankenForm eventId={event.id} totalAmount={event.totalAmount} />
        </CardContent>
      </Card>
    </div>
  );
}