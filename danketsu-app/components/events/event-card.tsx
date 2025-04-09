import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EventCardProps = {
  name: string;
  date: string;
  participants: number;
  host: string;
};

export default function EventCard({ name, date, participants, host }: EventCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Date: {date}</p>
        <p className="text-sm text-muted-foreground">Host: {host}</p>
        <p className="text-sm text-muted-foreground">Participants: {participants}</p>
      </CardContent>
    </Card>
  );
}
