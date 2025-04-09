"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { addEvent } from "@/lib/utils/events";

// イベントフォームのバリデーションスキーマ
const eventFormSchema = z.object({
  name: z.string().min(1, {
    message: "イベント名を入力してください",
  }),
  date: z.date({
    required_error: "日付を選択してください",
  }),
  venue: z.string().min(1, {
    message: "場所を入力してください",
  }),
  totalAmount: z.coerce.number().min(0, {
    message: "0以上の金額を入力してください",
  }),
});

// フォームの型
type EventFormValues = z.infer<typeof eventFormSchema>;

// デフォルト値
const defaultValues: Partial<EventFormValues> = {
  name: "",
  venue: "",
  totalAmount: 0,
};

export function EventForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // フォームの状態を初期化
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });

  // フォーム送信ハンドラー
  async function onSubmit(data: EventFormValues) {
    setIsLoading(true);
    
    try {
      // イベントをLocalStorageに保存
      addEvent({
        name: data.name,
        date: data.date.toISOString(),
        venue: data.venue,
        totalAmount: data.totalAmount,
      });
      
      // 成功したらイベント一覧ページに戻る
      router.push("/events");
      router.refresh();
    } catch (error) {
      console.error("イベントの作成に失敗しました", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>イベント名</FormLabel>
                <FormControl>
                  <Input placeholder="例: カラオケ大会" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>日付</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "yyyy/MM/dd")
                        ) : (
                          <span>日付を選択</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date("2000-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="venue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>場所</FormLabel>
                <FormControl>
                  <Input placeholder="例: 池尻、渋谷、川口など" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="totalAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>支払総額</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">円</span>
                    </div>
                  </div>
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
