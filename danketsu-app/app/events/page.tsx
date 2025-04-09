"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { getEvents } from "@/lib/utils/events";
import { Event } from "@/types";
import { format, parseISO } from "date-fns";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    setEvents(getEvents());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">イベント一覧</h1>
        <Button asChild>
          <Link href="/events/new">新規イベント</Link>
        </Button>
      </div>
      {events.length > 0 ? (
        <div className="grid gap-4">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold">{event.name}</h2>
                      <p className="text-sm text-gray-500">
                        {format(parseISO(event.date), "yyyy/MM/dd")} | {event.venue}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">¥{event.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center py-8 text-gray-500">イベントはまだありません</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
