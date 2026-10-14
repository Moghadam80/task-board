'use client';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

type DashboardPageHeaderProps = {
  onCreateTask: () => void;
};

export function DashboardPageHeader({
  onCreateTask,
}: DashboardPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="mb-1 text-sm font-medium text-indigo-600">
          کاربان
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          مدیریت وظایف
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          وظایف خود را مشاهده و مدیریت کنید.
        </p>
      </div>

      <Button onClick={onCreateTask} className="shrink-0">
        <Plus className="ml-2 h-4 w-4" />
        وظیفه جدید
      </Button>
    </div>
  );
}