import { Button } from "./ui/button";
import { Card } from "./ui/card";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
      در حال بارگذاری فضای کاری…
    </div>
  );
}

export function LoadingBoard() {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="space-y-3">
          <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-white" />
          <div className="h-36 animate-pulse rounded-2xl bg-white" />
        </div>
      ))}
    </div>
  );
}

export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md p-8 text-center">
        <h1 className="text-xl font-black">ارتباط با سرویس برقرار نشد</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">{message}</p>
        <Button className="mt-6" onClick={onRetry}>
          تلاش مجدد
        </Button>
      </Card>
    </div>
  );
}
