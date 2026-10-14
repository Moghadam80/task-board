'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { CalendarDays, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { RichTextViewer } from '@/components/rich-text-viewer';
import { Badge } from '@/components/ui/badge';
import { priorityLabels, type Task } from '@/lib/tasks';

function localIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDueDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fa-IR');
}

const priorityClasses = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-rose-50 text-rose-700',
};

export function TaskCard({
  task,
  canDelete,
  onEdit,
  onDelete,
}: {
  task: Task;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const overdue = Boolean(task.dueDate && task.status !== 'done' && task.dueDate.slice(0, 10) < localIsoDate());

  return (
    <article className={'rounded-2xl border bg-white p-4 shadow-sm transition ' + (overdue ? 'border-rose-200' : 'border-slate-200 hover:border-indigo-200 hover:shadow-md')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge className={priorityClasses[task.priority]}>{priorityLabels[task.priority]}</Badge>
          <h3 className="mt-3 font-bold leading-7 text-slate-900">{task.title}</h3>
        </div>
        <Menu>
          <MenuButton
            aria-label="عملیات وظیفه"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-50"
          >
            <MoreVertical size={16} />
          </MenuButton>
          <MenuItems
            anchor="bottom end"
            className="z-50 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg outline-none"
          >
            <MenuItem>
              <button
                type="button"
                onClick={onEdit}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 data-focus:bg-slate-50"
              >
                <Pencil size={14} />
                ویرایش
              </button>
            </MenuItem>
            {canDelete && (
              <MenuItem>
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 data-focus:bg-rose-50"
                >
                  <Trash2 size={14} />
                  حذف
                </button>
              </MenuItem>
            )}
          </MenuItems>
        </Menu>
      </div>
      <div className="mt-2 line-clamp-3 overflow-hidden">
        <RichTextViewer value={task.description} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
            {(task.assignee?.name ?? task.creator?.name ?? '-').slice(0, 1)}
          </span>
          {task.assignee?.name ?? 'بدون مسئول'}
        </span>
        {task.dueDate && (
          <span className={'flex items-center gap-1 ' + (overdue ? 'font-semibold text-rose-600' : '')} aria-label={overdue ? 'مهلت انجام گذشته است' : 'مهلت انجام'}>
            <CalendarDays size={13} />
            {overdue ? 'گذشته: ' : ''}{formatDueDate(task.dueDate)}
          </span>
        )}
      </div>
    </article>
  );
}
