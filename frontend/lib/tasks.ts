import { z } from 'zod';

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done']);
export const taskPrioritySchema = z.enum(['low', 'medium', 'high']);
export const userRoleSchema = z.enum(['owner', 'manager', 'member']);

export const tiptapDocumentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'عنوان باید حداقل ۲ کاراکتر باشد')
    .max(180, 'عنوان بیش از حد طولانی است'),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  assigneeId: z.string().uuid('مسئول انتخاب‌شده معتبر نیست').nullable(),
  dueDate: z.string().nullable(),
  description: tiptapDocumentSchema,
});

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'نام باید حداقل ۲ کاراکتر باشد').max(120),
  email: z.string().email('ایمیل معتبر وارد کنید').max(254),
  password: z
    .string()
    .min(10, 'رمز عبور باید حداقل ۱۰ کاراکتر باشد')
    .max(128)
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'رمز عبور باید شامل حرف و عدد باشد'),
  role: z.enum(['manager', 'member']),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type TipTapDocument = z.infer<typeof tiptapDocumentSchema>;
export type TaskInput = z.infer<typeof taskFormSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  description: TipTapDocument;
  dueDate: string | null;
  creatorId: string;
  assigneeId: string | null;
  creator?: User;
  assignee?: User | null;
  createdAt: string;
  updatedAt: string;
};

export const statusLabels: Record<TaskStatus, string> = {
  todo: 'برای انجام',
  in_progress: 'در حال انجام',
  done: 'انجام‌شده',
};

export const priorityLabels: Record<TaskPriority, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
};

export const roleLabels: Record<UserRole, string> = {
  owner: 'مالک',
  manager: 'مدیر',
  member: 'عضو',
};

export const emptyDescription: TipTapDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export type TaskFilters = {
  status?: TaskStatus;
  assigneeId?: string;
  search?: string;
};

export type TaskPage = { items: Task[]; page: number; limit: number; total: number; hasNextPage: boolean };

export type TaskActivity = {
  id: string;
  action: 'created' | 'updated' | 'deleted';
  changes: Record<string, { from: unknown; to: unknown }> ;
  createdAt: string;
  actor: { id: string; name: string } | null;
};
