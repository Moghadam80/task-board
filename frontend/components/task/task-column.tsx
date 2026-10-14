
import { TaskCard } from '@/components/task/task-card';
import {
  statusLabels,
  type Task,
  type TaskStatus,
} from '@/lib/tasks';

type TaskColumnProps = {
  status: TaskStatus;
  tasks: Task[];
  currentUserId: string;
  isMember: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

const columnStyles: Record<TaskStatus, {
  color: string;
  dot: string;
}> = {
  todo: {
    color: 'text-slate-600',
    dot: 'bg-slate-400',
  },
  in_progress: {
    color: 'text-indigo-600',
    dot: 'bg-indigo-500',
  },
  done: {
    color: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
};

export function TaskColumn({
  status,
  tasks,
  currentUserId,
  isMember,
  onEdit,
  onDelete,
}: TaskColumnProps) {
  const style = columnStyles[status];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={`flex items-center gap-2 font-bold ${style.color}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
          {statusLabels[status]}
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
            {tasks.length}
          </span>
        </h2>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            canDelete={
              !isMember || task.creatorId === currentUserId
            }
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-400">
            وظیفه‌ای در این ستون نیست
          </div>
        )}
      </div>
    </section>
  );
}
