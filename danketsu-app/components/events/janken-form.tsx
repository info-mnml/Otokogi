"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Participant } from "@/types";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { recordJankenResult } from "@/lib/utils/participations";

const jankenSchema = z.object({
  winnerId: z.string().min(1, "勝者は必須です"),
  loserId: z.string().min(1, "敗者は必須です"),
  winnerChoice: z.enum(["グー", "チョキ", "パー"], {
    required_error: "勝者の手は必須です",
  }),
  loserChoice: z.enum(["グー", "チョキ", "パー"], {
    required_error: "敗者の手は必須です",
  }),
  amount: z.coerce.number().min(1, "金額は1円以上で入力してください"),
});

type JankenFormProps = {
  eventId: string;
  participants: Participant[];
};

export function JankenForm({ eventId, participants }: JankenFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof jankenSchema>>({
    resolver: zodResolver(jankenSchema),
    defaultValues: {
      winnerId: "",
      loserId: "",
      winnerChoice: undefined,
      loserChoice: undefined,
      amount: 1000,
    },
  });

  const winnerId = form.watch("winnerId");
  const loserId = form.watch("loserId");

  const onSubmit = async (data: z.infer<typeof jankenSchema>) => {
    if (data.winnerId === data.loserId) {
      form.setError("loserId", {
        type: "manual",
        message: "勝者と敗者は異なる人を選択してください",
      });
      return;
    }

    // じゃんけんの手の整合性をチェック
    const validCombinations = [
      { winner: "グー", loser: "チョキ" },
      { winner: "チョキ", loser: "パー" },
      { winner: "パー", loser: "グー" },
    ];

    const isValidCombination = validCombinations.some(
      combo => combo.winner === data.winnerChoice && combo.loser === data.loserChoice
    );

    if (!isValidCombination) {
      form.setError("loserChoice", {
        type: "manual",
        message: `${data.winnerChoice}は${data.loserChoice}に勝てません`,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await recordJankenResult(
        eventId,
        data.winnerId,
        data.loserId,
        data.winnerChoice,
        data.loserChoice,
        data.amount
      );

      toast({
        title: "じゃんけん結果を記録しました",
        description: `${participants.find(p => p.id === data.winnerId)?.name}の勝ち (${data.amount.toLocaleString()}円)`,
      });

      // フォームをリセット
      form.reset({
        winnerId: "",
        loserId: "",
        winnerChoice: undefined,
        loserChoice: undefined,
        amount: 1000,
      });

      // 画面を更新
      router.refresh();
    } catch (error) {
      console.error("Failed to record janken result:", error);
      toast({
        title: "エラーが発生しました",
        description: "じゃんけん結果の記録に失敗しました。後でもう一度お試しください。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="winnerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>勝者</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="勝者を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {participants.map((participant) => (
                      <SelectItem
                        key={participant.id}
                        value={participant.id}
                        disabled={participant.id === loserId}
                      >
                        {participant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="loserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>敗者</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="敗者を選択" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {participants.map((participant) => (
                      <SelectItem
                        key={participant.id}
                        value={participant.id}
                        disabled={participant.id === winnerId}
                      >
                        {participant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="winnerChoice"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>勝者の手</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4"
                  >
                    <FormItem className="flex items-center space-x-1 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="グー" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        グー
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-1 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="チョキ" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        チョキ
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-1 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="パー" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        パー
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="loserChoice"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>敗者の手</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4"
                  >
                    <FormItem className="flex items-center space-x-1 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="グー" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        グー
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center
