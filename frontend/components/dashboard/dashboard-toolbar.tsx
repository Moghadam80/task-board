
'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectListbox } from '@/components/ui/select-listbox';
import { statusLabels, type TaskStatus } from '@/lib/tasks';

const columns: TaskStatus[] = ['todo', 'in_progress', 'done'];

type FilterOption = {
  value: string;
  label: string;
};

type DashboardToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  status: 'all' | TaskStatus;
  onStatusChange: (value: 'all' | TaskStatus) => void;
  assigneeId: string;
  onAssigneeChange: (value: string) => void;
  assigneeOptions: FilterOption[];
  onReset: () => void;
};

export function DashboardToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  assigneeId,
  onAssigneeChange,
  assigneeOptions,
  onReset,
}: DashboardToolbarProps) {
  return (
    <Card className="mb-6 p-3">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute right-3 top-3 text-slate-400"
            size={17}
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="جست‌وجوی عنوان یا مسئول..."
            className="pr-10"
          />
        </div>

        <SelectListbox<'all' | TaskStatus>
          aria-label="فیلتر وضعیت"
          className="min-w-44"
          value={status}
          onChange={onStatusChange}
          options={[
            { value: 'all', label: 'همه وضعیت‌ها' },
            ...columns.map((id) => ({
              value: id,
              label: statusLabels[id],
            })),
          ]}
        />

        <SelectListbox
          aria-label="فیلتر مسئول"
          className="min-w-44"
          value={assigneeId}
          onChange={onAssigneeChange}
          options={assigneeOptions}
        />

        <Button variant="secondary" onClick={onReset}>
          پاک‌سازی
        </Button>
      </div>
    </Card>
  );
}
