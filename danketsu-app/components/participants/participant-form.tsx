"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { createParticipant, updateParticipant } from "@/lib/utils/participants";
import type { ParticipantFormData } from "@/types";

const participantSchema = z.object({
  name: z.string().min(1, "参加者名は必須です"),
});

type ParticipantFormProps = {
  defaultValues?: ParticipantFormData;
  participantId?: string;
};

export function ParticipantForm({ defaultValues, participantId }: ParticipantFormProps) {
  const router = useRouter();
  const isEditing = !!participantId;

  const form = useForm<z.infer<typeof participantSchema>>({
    resolver: zodResolver(participantSchema),
    defaultValues: {
      name: defaultValues?.name || "",
    },
  });

  const onSubmit = async (data: z.infer<typeof participantSchema>) => {
    try {
      const participantData = {
        ...data,
        winCount: defaultValues?.winCount || 0,
        loseCount: defaultValues?.loseCount || 0,
        totalPaid: defaultValues?.totalPaid || 0,
        totalCollected: defaultValues?.totalCollected || 0,
      };

      if (isEditing && participantId) {
        await updateParticipant(participantId, participantData);
        toast({
          title: "参加者情報を更新しました",
        });
      } else {
        await createParticipant(participantData);
        toast({
          title: "新規参加者を登録しました",
        });
      }

      router.push("/participants");
      router.refresh();
    } catch (error) {
      console.error("Failed to save participant:", error);
      toast({
        title: "エラーが発生しました",
        description: "参加者の保存に失敗しました。後でもう一度お試しください。",
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
              <FormLabel>参加者名</FormLabel>
              <FormControl>
                <Input placeholder="例: 山田太郎" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            キャンセル
          </Button>
          <Button type="submit">
            {isEditing ? "更新する" : "登録する"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
