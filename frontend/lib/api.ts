import type { CreateUserInput, Task, TaskActivity, TaskFilters, TaskInput, TaskPage, User } from './tasks';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshInFlight: Promise<unknown> | null = null;

function isAuthMutation(path: string) {
  return path === '/auth/login' || path === '/auth/refresh' || path === '/auth/logout';
}

async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const response = await fetch('/api/v1' + path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    cache: 'no-store',
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);

  if (response.status === 401 && retry && !isAuthMutation(path)) {
    await refreshSession();
    return request<T>(path, init, false);
  }

  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join('، ')
      : typeof body?.message === 'string'
        ? body.message
        : 'ارتباط با سرور ناموفق بود.';
    throw new ApiError(response.status, message);
  }

  return body as T;
}

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = request('/auth/refresh', { method: 'POST' }, false).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function taskQuery(filters?: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters?.search?.trim()) params.set('search', filters.search.trim());
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  me: () => request<User>('/auth/me'),
  login: (email: string, password: string) =>
    request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  tasks: (filters?: TaskFilters, page = 1, limit = 50) => {
    const params = new URLSearchParams(taskQuery(filters).replace(/^\?/, ''));
    params.set('page', String(page));
    params.set('limit', String(limit));
    return request<TaskPage>('/todos?' + params.toString());
  },
  directory: () => request<User[]>('/users/directory'),
  users: () => request<User[]>('/users'),
  createUser: (input: CreateUserInput) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(input) }),
  updateUser: (id: string, input: Partial<Pick<User, 'role' | 'isActive' | 'name' | 'email'>>) =>
    request<User>('/users/' + id, { method: 'PATCH', body: JSON.stringify(input) }),
  createTask: (input: TaskInput) =>
    request<Task>('/todos', { method: 'POST', body: JSON.stringify(input) }),
  updateTask: (id: string, input: TaskInput, expectedUpdatedAt?: string) =>
    request<Task>('/todos/' + id, { method: 'PATCH', body: JSON.stringify({ ...input, ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}) }) }),
  deleteTask: (id: string) => request<{ success: boolean }>('/todos/' + id, { method: 'DELETE' }),
  taskActivity: (id: string) => request<TaskActivity[]>('/todos/' + id + '/activity'),
};
