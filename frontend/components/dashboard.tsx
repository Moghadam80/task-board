'use client';

import { LayoutDashboard, LogOut, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { AuthForm } from '@/components/auth-form';
import { TaskBoard } from '@/components/task/task-board';
import { TaskDialog } from '@/components/task/task-dialog';
import { TaskPagination } from '@/components/task/task-pagination';
import { UsersPanel } from '@/components/task/users-panel';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { useDebounce } from '@/hooks/use-debounce';
import { ApiError, api } from '@/lib/api';
import {
  useDirectory,
  useMe,
  useTaskMutations,
  useTasks,
  useUsers,
} from '@/lib/queries';
import {
  roleLabels,
  type Task,
  type TaskFilters,
  type TaskInput,
  type TaskStatus,
} from '@/lib/tasks';

import { ErrorScreen, LoadingScreen } from './loading-card';
import { DashboardToolbar } from './dashboard/dashboard-toolbar';
import { DashboardPageHeader } from './dashboard/dashboard-page-header';
import { DashboardNotice } from './dashboard/dashboard-notice';

export function Dashboard() {
  const me = useMe();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | TaskStatus>('all');
  const [assigneeId, setAssigneeId] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [notice, setNotice] = useState('');

  const queryClient = useQueryClient();

  const userId = me.data?.id;
  const isMember = me.data?.role === 'member';

  const debouncedSearch = useDebounce(search.trim(), 300);

  const filters: TaskFilters = {
    status: status === 'all' ? undefined : status,
    assigneeId: assigneeId === 'all' ? undefined : assigneeId,
    search: debouncedSearch || undefined,
  };

  const tasks = useTasks(userId, filters);
  const directory = useDirectory(userId, !isMember);
  const users = useUsers(userId, me.data?.role === 'owner');

  const mutations = useTaskMutations();

  const allTasks = useMemo(
    () => tasks.data?.pages.flatMap((page) => page.items) ?? [],
    [tasks.data],
  );

  if (me.isLoading) {
    return <LoadingScreen />;
  }

  if (me.error instanceof ApiError && me.error.status === 401) {
    return <AuthForm onSuccess={() => void me.refetch()} />;
  }

  if (me.error) {
    return (
      <ErrorScreen
        message={me.error.message}
        onRetry={() => void me.refetch()}
      />
    );
  }

  if (!me.data) return null;

  const currentUser = me.data;

  const memberAssignees = new Map<string, string>([
    [currentUser.id, currentUser.name],
  ]);

  for (const task of allTasks) {
    if (task.assignee) {
      memberAssignees.set(task.assignee.id, task.assignee.name);
    }
  }

  const assigneeOptions = [
    { value: 'all', label: 'همه مسئول‌ها' },
    ...(isMember
      ? Array.from(memberAssignees, ([value, label]) => ({
          value,
          label,
        }))
      : (directory.data ?? []).map((user) => ({
          value: user.id,
          label: user.name,
        }))),
  ];

  const saveTask = async (input: TaskInput) => {
    try {
      if (editing) {
        await mutations.update.mutateAsync({
          id: editing.id,
          input,
          expectedUpdatedAt: editing.updatedAt,
        });
      } else {
        await mutations.create.mutateAsync(input);
      }

      setDialogOpen(false);
      setEditing(null);
      setNotice('تغییرات با موفقیت ذخیره شد.');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: ['tasks'],
        });

        setDialogOpen(false);
        setEditing(null);
        setNotice(
          'این وظیفه توسط کاربر دیگری تغییر کرده است؛ فهرست تازه شد. لطفاً دوباره آن را باز کنید.',
        );
        return;
      }

      throw error;
    }
  };

  const deleteTask = async () => {
    if (!pendingDelete) return;

    try {
      await mutations.remove.mutateAsync(pendingDelete.id);
      setNotice('وظیفه حذف شد.');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'حذف وظیفه ناموفق بود.',
      );
    } finally {
      setPendingDelete(null);
    }
  };

  const logout = async () => {
    await api.logout().catch(() => undefined);

    queryClient.removeQueries({ queryKey: ['tasks'] });
    queryClient.removeQueries({ queryKey: ['directory'] });
    queryClient.removeQueries({ queryKey: ['users'] });

    await me.refetch();
  };

  const openCreateDialog = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditing(task);
    setDialogOpen(true);
  };

  const closeTaskDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef2ff_0%,#f8fafc_180px)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-600 p-2.5 text-white shadow-sm">
              <LayoutDashboard size={21} />
            </div>

            <div>
              <p className="text-lg font-black">کاربان</p>
              <p className="hidden text-xs text-slate-400 sm:block">
                سامانه مدیریت وظایف تیمی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-left sm:block">
              <p className="text-sm font-bold">{currentUser.name}</p>
              <p className="text-xs text-slate-400">
                {roleLabels[currentUser.role]} · {currentUser.email}
              </p>
            </div>

            <Button
              variant="ghost"
              className="min-h-9 px-2"
              aria-label="خروج"
              onClick={() => void logout()}
            >
              <LogOut size={17} />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-8">
        <div className="mb-8">
          <DashboardPageHeader onCreateTask={openCreateDialog} />
        </div>

        <div className="mb-5">
          <DashboardNotice notice={notice} />
        </div>

        {currentUser.role === 'owner' && (
          <UsersPanel
            users={users.data ?? []}
            currentUser={currentUser}
          />
        )}

        <DashboardToolbar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          assigneeId={assigneeId}
          onAssigneeChange={setAssigneeId}
          assigneeOptions={assigneeOptions}
          onReset={() => {
            setSearch('');
            setStatus('all');
            setAssigneeId('all');
          }}
        />

        <TaskBoard
          tasks={allTasks}
          isLoading={tasks.isLoading}
          error={tasks.error}
          onRetry={() => void tasks.refetch()}
          currentUserId={currentUser.id}
          isMember={isMember}
          onEdit={openEditDialog}
          onDelete={setPendingDelete}
        />

        {tasks.data?.pages[0] && !tasks.isLoading && (
          <div className="mt-6">
            <TaskPagination
              count={allTasks.length}
              hasNextPage={Boolean(tasks.hasNextPage)}
              isFetchingNextPage={tasks.isFetchingNextPage}
              onLoadMore={() => {
                void tasks.fetchNextPage();
              }}
            />

            <p
              className="mt-3 text-center text-xs text-slate-400"
              aria-live="polite"
            >
              نمایش {allTasks.length.toLocaleString('fa-IR')} از{' '}
              {tasks.data.pages[0].total.toLocaleString('fa-IR')} وظیفه
            </p>
          </div>
        )}

        <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
          <Users size={14} />
        </div>
      </main>

      <TaskDialog
        open={dialogOpen}
        onClose={closeTaskDialog}
        onSave={saveTask}
        task={editing}
        users={directory.data ?? [currentUser]}
        currentUser={currentUser}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="حذف وظیفه"
        description={
          pendingDelete
            ? `وظیفه «${pendingDelete.title}» حذف شود؟ این کار قابل بازگشت نیست.`
            : ''
        }
        confirmLabel="حذف"
        onConfirm={() => void deleteTask()}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}