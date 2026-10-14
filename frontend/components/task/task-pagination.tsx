'use client';

import { LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

type TaskPaginationProps = {
  count: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

export function TaskPagination({
  count,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: TaskPaginationProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-5 sm:flex-row">
      <p className="text-sm text-slate-500">
        تعداد وظایف نمایش‌داده‌شده:{' '}
        <span className="font-semibold text-slate-800">
          {count.toLocaleString('fa-IR')}
        </span>
      </p>

      {hasNextPage && (
        <Button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage && (
            <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />
          )}
          {isFetchingNextPage ? 'در حال دریافت...' : 'نمایش وظایف بیشتر'}
        </Button>
      )}
    </div>
  );
}