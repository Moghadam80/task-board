'use client';

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { History, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { RichTextEditor } from '@/components/rich-text-editor';
import { api } from '@/lib/api';
import type { TaskActivity } from '@/lib/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectListbox } from '@/components/ui/select-listbox';
import {
  emptyDescription,
  priorityLabels,
  statusLabels,
  taskFormSchema,
  type Task,
  type TaskInput,
  type TaskPriority,
  type TaskStatus,
  type User,
} from '@/lib/tasks';

export function TaskDialog({
  open,
  onClose,
  onSave,
  task,
  users,
  currentUser,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: TaskInput) => Promise<void>;
  task?: Task | null;
  users: User[];
  currentUser: User;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      status: 'todo',
      priority: 'medium',
      assigneeId: currentUser.id,
      dueDate: null,
      description: emptyDescription,
    },
  });
  const [serverError, setServerError] = useState('');
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const description = useWatch({ control, name: 'description' });
  const isMember = currentUser.role === 'member';
  const assigneeOptions = isMember
    ? [
        { value: '', label: 'بدون مسئول' },
        { value: currentUser.id, label: currentUser.name },
        ...(task?.assignee && task.assignee.id !== currentUser.id
          ? [{ value: task.assignee.id, label: task.assignee.name }]
          : []),
      ]
    : [
        { value: '', label: 'بدون مسئول' },
        ...users
          .filter((user) => user.isActive)
          .map((user) => ({ value: user.id, label: user.name })),
      ];

  const submit = async (values: TaskInput) => {
    setServerError('');
    try {
      await onSave(values);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'ذخیره‌سازی ناموفق بود.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!open || !task) {
      setActivity([]);
      return;
    }
    setActivityLoading(true);
    api.taskActivity(task.id)
      .then((items) => { if (!cancelled) setActivity(items); })
      .catch(() => { if (!cancelled) setActivity([]); })
      .finally(() => { if (!cancelled) setActivityLoading(false); });
    return () => { cancelled = true; };
  }, [open, task?.id]);

  useEffect(() => {
    setServerError('');
    reset(
      task
        ? {
            title: task.title,
            status: task.status,
            priority: task.priority,
            assigneeId: task.assigneeId,
            dueDate: task.dueDate,
            description: task.description ?? emptyDescription,
          }
        : {
            title: '',
            status: 'todo',
            priority: 'medium',
            assigneeId: currentUser.id,
            dueDate: null,
            description: emptyDescription,
          },
    );
  }, [currentUser.id, open, reset, task]);

  return (
    <Transition show={open}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" />
        </TransitionChild>
        <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
          <TransitionChild
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-3 scale-[.98]"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0 translate-y-2"
          >
            <DialogPanel className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl font-black text-slate-900">
                    {task ? 'ویرایش وظیفه' : 'ایجاد وظیفه جدید'}
                  </DialogTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    توضیحات به‌صورت سند JSON تیپ‌تپ ذخیره می‌شود، نه HTML.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="بستن"
                  onClick={onClose}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={19} />
                </button>
              </div>
              <form onSubmit={handleSubmit(submit)} className="space-y-5">
                <div>
                  <label htmlFor="task-title" className="mb-2 block text-sm font-semibold">
                    عنوان وظیفه <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    id="task-title"
                    autoFocus
                    aria-invalid={Boolean(errors.title)}
                    aria-describedby={errors.title ? 'task-title-error' : undefined}
                    placeholder="مثلاً پیاده‌سازی صفحه ورود"
                    {...register('title')}
                  />
                  {errors.title && (
                    <p id="task-title-error" className="mt-1 text-xs text-rose-600">{errors.title.message}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">وضعیت</label>
                    <Controller
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <SelectListbox<TaskStatus>
                          aria-label="وضعیت"
                          value={field.value}
                          onChange={field.onChange}
                          options={(Object.keys(statusLabels) as TaskStatus[]).map((status) => ({
                            value: status,
                            label: statusLabels[status],
                          }))}
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">اولویت</label>
                    <Controller
                      control={control}
                      name="priority"
                      render={({ field }) => (
                        <SelectListbox<TaskPriority>
                          aria-label="اولویت"
                          value={field.value}
                          onChange={field.onChange}
                          options={(Object.keys(priorityLabels) as TaskPriority[]).map(
                            (priority) => ({
                              value: priority,
                              label: priorityLabels[priority],
                            }),
                          )}
                        />
                      )}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">مسئول</label>
                    <Controller
                      control={control}
                      name="assigneeId"
                      render={({ field }) => (
                        <SelectListbox<string>
                          aria-label="مسئول"
                          value={field.value ?? ''}
                          onChange={(value) => field.onChange(value || null)}
                          options={assigneeOptions}
                        />
                      )}
                    />
                    {errors.assigneeId && (
                      <p className="mt-1 text-xs text-rose-600">{errors.assigneeId.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="task-due-date" className="mb-2 block text-sm font-semibold">
                      مهلت انجام
                    </label>
                    <Input
                      id="task-due-date"
                      type="date"
                      {...register('dueDate', { setValueAs: (value) => value || null })}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">توضیحات</label>
                  <RichTextEditor
                    value={description ?? emptyDescription}
                    onChange={(value) =>
                      setValue('description', value, { shouldDirty: true, shouldValidate: true })
                    }
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-rose-600">توضیحات معتبر نیست.</p>
                  )}
                </div>
                {task && (
                  <section aria-labelledby="task-activity-heading" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 id="task-activity-heading" className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
                      <History size={16} /> تاریخچه تغییرات
                    </h3>
                    {activityLoading ? (
                      <p className="text-sm text-slate-500" role="status">در حال دریافت تاریخچه…</p>
                    ) : activity.length === 0 ? (
                      <p className="text-sm text-slate-500">هنوز رویدادی برای این وظیفه ثبت نشده است.</p>
                    ) : (
                      <ol className="space-y-3">
                        {activity.map((event) => (
                          <li key={event.id} className="border-r-2 border-indigo-200 pr-3">
                            <p className="text-sm font-semibold text-slate-800">
                              {event.action === 'created' ? 'وظیفه ایجاد شد' : event.action === 'deleted' ? 'وظیفه حذف شد' : 'وظیفه ویرایش شد'}
                              <span className="font-normal text-slate-500"> · {event.actor?.name ?? 'کاربر حذف‌شده'}</span>
                            </p>
                            {event.action === 'updated' && Object.keys(event.changes).length > 0 && (
                              <p className="mt-1 text-xs leading-6 text-slate-600">
                                {Object.keys(event.changes).map((key) => ({ title: 'عنوان', status: 'وضعیت', priority: 'اولویت', assigneeId: 'مسئول', dueDate: 'مهلت انجام', description: 'توضیحات' }[key] ?? key)).join('، ')} تغییر کرد
                              </p>
                            )}
                            <time dateTime={event.createdAt} className="mt-1 block text-xs text-slate-400">
                              {new Date(event.createdAt).toLocaleString('fa-IR')}
                            </time>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                )}
                {serverError && (
                  <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {serverError}
                  </p>
                )}
                <div className="flex justify-start gap-3 border-t border-slate-100 pt-5">
                  <Button type="submit" disabled={isSubmitting}>
                    <Save size={16} />
                    {isSubmitting ? 'در حال ذخیره…' : 'ذخیره وظیفه'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={onClose}>
                    انصراف
                  </Button>
                </div>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
