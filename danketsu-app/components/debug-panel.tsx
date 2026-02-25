// MongoDB移行後はLocalStorageデバッグパネルは不要になります
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DebugPanel() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>デバッグパネル</CardTitle>
        <CardDescription>
          データベースに接続しています。LocalStorageは使用されていません。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          アプリケーションはMongoDBに正常に接続されています。
        </p>
      </CardContent>
    </Card>
  );
}
