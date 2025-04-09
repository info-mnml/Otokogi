import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export function MigrateDataDialog() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    stats?: {
      participantsCount: number;
      eventsCount: number;
      participationsCount: number;
    };
    error?: string;
  } | null>(null);

  const handleMigrate = async () => {
    try {
      setLoading(true);
      setResult(null);

      // LocalStorageからデータを取得
      const events = JSON.parse(localStorage.getItem('events') || '[]');
      const participants = JSON.parse(localStorage.getItem('participants') || '[]');
      const participations = JSON.parse(localStorage.getItem('participations') || '[]');

      // APIを呼び出してデータ移行を実行
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          participants,
          participations,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '移行処理に失敗しました');
      }

      setResult({
        success: true,
        message: 'データ移行が完了しました',
        stats: data.stats,
      });
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">データベース移行</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>データベース移行</DialogTitle>
          <DialogDescription>
            ローカルに保存されているデータをクラウドデータベースに移行します。
            この処理は元に戻せないため、注意して実行してください。
          </DialogDescription>
        </DialogHeader>

        {result?.success && (
          <Alert className="bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>成功</AlertTitle>
            <AlertDescription>
              {result.message}
              {result.stats && (
                <div className="mt-2 text-sm">
                  <p>移行されたデータ:</p>
                  <ul className="list-disc list-inside">
                    <li>参加者: {result.stats.participantsCount}人</li>
                    <li>イベント: {result.stats.eventsCount}件</li>
                    <li>参加記録: {result.stats.participationsCount}件</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {result?.success === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={loading}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={loading || result?.success}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                移行中...
              </>
            ) : (
              '移行を実行'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
