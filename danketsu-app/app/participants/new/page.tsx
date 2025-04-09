import { ParticipantForm } from "@/components/participants/participant-form";

export default function NewParticipantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">新規参加者登録</h1>
      <ParticipantForm />
    </div>
  );
}
