import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ParticipantCardProps = {
  name: string;
  nickname?: string;
  totalWins: number;
};

export default function ParticipantCard({ name, nickname, totalWins }: ParticipantCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{name} {nickname && `(${nickname})`}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Total Wins: {totalWins}</p>
      </CardContent>
    </Card>
  );  
}
