"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Participant, Participation } from "@/types";
import { getParticipants, updateParticipant } from "@/lib/utils/participants";
import { addParticipations, getParticipationsByEventId } from "@/lib/utils/participations";

const jankenFormSchema = z.object({
  participantIds: z.array(z.string()).min(1, {
    message: "少なくとも1人の参加者を選択してください",
  }),
  winnerId: z.string().min(1, {
    message: "勝者を選択してください",
  }),
});

type JankenFormValues = z.infer<typeof jankenFormSchema>;

export function JankenForm({ eventId, totalAmount }: { eventId: string; totalAmount: number }) {
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フォームの初期化
  const form = useForm<JankenFormValues>({
    resolver: zodResolver(jankenFormSchema),
    defaultValues: {
      participantIds: [],
      winnerId: "",
    },
  });

  // コンポーネントマウント時に既存のデータをロード
  useEffect(() => {
    const loadData = async () => {
      try {
        // 参加者データをロード
        const allParticipants = getParticipants();
        setParticipants(allParticipants);

        // 既存の参加記録をロード
        const existingParticipations = getParticipationsByEventId(eventId);
        
        if (existingParticipations.length > 0) {
          // 参加者IDのリストを作成
          const participantIds = existingParticipations.map((p: Participation) => p.participantId);
          
          // 勝者を特定
          const winner = existingParticipations.find((p: Participation) => p.won === true);
          const winnerId = winner ? winner.participantId : "";
          
          // フォームに値をセット
          form.reset({
            participantIds: participantIds,
            winnerId: winnerId
          });
          
          console.log("既存のじゃんけん結果を読み込みました", { participantIds, winnerId });
        }
      } catch (error) {
        console.error("データ読み込み中にエラーが発生しました", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [eventId, form]);

  const watchParticipantIds = form.watch("participantIds");

  // 参加者選択時に勝者が参加者に含まれていない場合はリセット
  useEffect(() => {
    const winnerId = form.getValues("winnerId");
    if (winnerId && !watchParticipantIds.includes(winnerId)) {
      form.setValue("winnerId", "");
    }
  }, [watchParticipantIds, form]);

  // 送信処理
  async function onSubmit(data: JankenFormValues) {
    setIsSubmitting(true);
    try {
      const { participantIds, winnerId } = data;
      const participantCount = participantIds.length;
      
      // 予想支払額（一人当たり）
      const expectedAmount = Math.floor(totalAmount / participantCount);
      
      // 各参加者の記録を更新
      participantIds.forEach(id => {
        const participant = participants.find(p => p.id === id);
        if (participant) {
          const isWinner = id === winnerId;
          const updates = {
            totalParticipation: (participant.totalParticipation || 0) + 1,
            winCount: isWinner ? (participant.winCount || 0) + 1 : (participant.winCount || 0),
            lossCount: isWinner ? (participant.lossCount || 0) : (participant.lossCount || 0) + 1,
            totalPaid: isWinner ? (participant.totalPaid || 0) + totalAmount : (participant.totalPaid || 0),
            totalExpected: (participant.totalExpected || 0) + expectedAmount,
          };
          updateParticipant(id, updates);
        }
      });
      
      // 参加記録を追加
      const participationsToSave = participantIds.map(id => {
        const isWinner = id === winnerId;
        return {
          eventId: eventId,
          participantId: id,
          attended: true,
          won: isWinner,
          paidAmount: isWinner ? totalAmount : 0,
          expectedAmount: expectedAmount
        };
      });
      
      // 参加記録の保存
      addParticipations(eventId, participationsToSave);

      // 送信成功後、現在のページをリロード
      setTimeout(() => {
        window.location.href = `/events/${eventId}?t=${Date.now()}`;
      }, 500);
    } catch (error) {
      console.error("じゃんけん結果の登録に失敗しました", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div>データを読み込み中...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="participantIds"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel>参加者</FormLabel>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {participants.map((participant) => (
                  <FormField
                    key={participant.id}
                    control={form.control}
                    name="participantIds"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={participant.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(participant.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, participant.id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== participant.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {participant.name}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="winnerId"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>勝者</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col space-y-1"
                >
                  {participants
                    .filter((participant) =>
                      watchParticipantIds.includes(participant.id)
                    )
                    .map((participant) => (
                      <FormItem
                        key={participant.id}
                        className="flex items-center space-x-3 space-y-0"
                      >
                        <FormControl>
                          <RadioGroupItem value={participant.id} />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {participant.name}
                        </FormLabel>
                      </FormItem>
                    ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
        </div>
      </form>
    </Form>
  );
}