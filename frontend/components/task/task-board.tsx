
import { TaskColumn } from '@/components/task/task-column';
import { ErrorScreen, LoadingBoard } from '@/components/loading-card';
import type { Task, TaskStatus } from '@/lib/tasks';

const columns: TaskStatus[] = ['todo', 'in_progress', 'done'];

type TaskBoardProps = {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  currentUserId: string;
  isMember: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskBoard({
  tasks,
  isLoading,
  error,
  onRetry,
  currentUserId,
  isMember,
  onEdit,
  onDelete,
}: TaskBoardProps) {
  if (isLoading) return <LoadingBoard />;

  if (error) {
    return <ErrorScreen message={error.message} onRetry={onRetry} />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {columns.map((status) => (
        <TaskColumn
          key={status}
          status={status}
          tasks={tasks.filter((task) => task.status === status)}
          currentUserId={currentUserId}
          isMember={isMember}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
