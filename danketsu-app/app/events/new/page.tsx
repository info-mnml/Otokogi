import { EventForm } from "@/components/events/event-form";

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">新規イベント登録</h1>
      <EventForm />
    </div>
  );
}
