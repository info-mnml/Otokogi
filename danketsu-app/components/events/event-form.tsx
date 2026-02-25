"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createEvent, updateEvent } from "@/lib/utils/events";
import type { EventFormData } from "@/types";

const eventSchema = z.object({
  name: z.string().min(1, "イベント名は必須です"),
  date: z.string().min(1, "日付は必須です"),
  location: z.string().optional(),
  description: z.string().optional(),
  totalAmount: z.number().optional(),
});

type EventFormProps = {
  defaultValues?: EventFormData;
  eventId?: string;
};

export function EventForm({ defaultValues, eventId }: EventFormProps) {
  const router = useRouter();
  const isEditing = !!eventId;

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      date: defaultValues?.date
        ? new Date(defaultValues.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      location: defaultValues?.location || "",
      description: defaultValues?.description || "",
      totalAmount: defaultValues?.totalAmount || 0,
    },
  });

  const onSubmit = async (data: z.infer<typeof eventSchema>) => {
    try {
      const eventData = {
        ...data,
        date: new Date(data.date),
        totalAmount: data.totalAmount || 0,
      };

      if (isEditing && eventId) {
        await updateEvent(eventId, eventData);
        toast({
          title: "イベントを更新しました",
        });
      } else {
        await createEvent(eventData);
        toast({
          title: "新規イベントを作成しました",
        });
      }

      router.push("/events");
      router.refresh();
    } catch (error) {
      console.error("Failed to save event:", error);
      toast({
        title: "エラーが発生しました",
        description: "イベントの保存に失敗しました。後でもう一度お試しください。",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>イベント名</FormLabel>
              <FormControl>
                <Input placeholder="例: 新年会" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>日付</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>場所</FormLabel>
              <FormControl>
                <Input placeholder="例: 居酒屋〇〇" {...field} />
              </FormControl>
              <FormDescription>
                任意の項目です
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明</FormLabel>
              <FormControl>
                <Textarea placeholder="イベントの詳細情報" {...field} />
              </FormControl>
              <FormDescription>
                任意の項目です
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            キャンセル
          </Button>
          <Button type="submit">
            {isEditing ? "更新する" : "作成する"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
