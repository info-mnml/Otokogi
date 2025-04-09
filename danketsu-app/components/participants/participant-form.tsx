"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { addParticipant } from "@/lib/utils/participants";

// 参加者フォームのバリデーションスキーマ
const participantFormSchema = z.object({
  name: z.string().min(1, {
    message: "参加者名を入力してください",
  }),
});

// フォームの型
type ParticipantFormValues = z.infer<typeof participantFormSchema>;

// デフォルト値
const defaultValues: Partial<ParticipantFormValues> = {
  name: "",
};

export function ParticipantForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // フォームの状態を初期化
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantFormSchema),
    defaultValues,
  });

  // フォーム送信ハンドラー
  async function onSubmit(data: ParticipantFormValues) {
    setIsLoading(true);
    
    try {
      // 参加者をLocalStorageに保存
      addParticipant(data.name);
      
      // 成功したら参加者一覧ページに戻る
      router.push("/participants");
      router.refresh();
    } catch (error) {
      console.error("参加者の作成に失敗しました", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>参加者名</FormLabel>
                <FormControl>
                  <Input placeholder="例: ゆうき" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "保存中..." : "保存"}
          </Button>
        </div>
      </form>
    </Form>
  );
}