import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { CreateUserInput, TaskFilters, TaskInput, User } from './tasks';

// Data keys include the signed-in user's id so that logging out and in as a
// different user can never show the previous user's cached tasks/users.
export const queryKeys = {
  me: ['me'] as const,
  tasks: (userId: string | undefined, filters?: TaskFilters) =>
    ['tasks', userId, filters] as const,
  directory: (userId: string | undefined) => ['directory', userId] as const,
  users: (userId: string | undefined) => ['users', userId] as const,
};

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: api.me,
    retry: false,
    staleTime: 60_000,
  });
}

export function useTasks(userId: string | undefined, filters?: TaskFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks(userId, filters),
    queryFn: ({ pageParam }) => api.tasks(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    enabled: Boolean(userId),
    staleTime: 15_000,
  });
}

export function useDirectory(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.directory(userId),
    queryFn: api.directory,
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  });
}

export function useUsers(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.users(userId),
    queryFn: api.users,
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  });
}

export function useTaskMutations() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['tasks'] });
  return {
    create: useMutation({
      mutationFn: (input: TaskInput) => api.createTask(input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, input, expectedUpdatedAt }: { id: string; input: TaskInput; expectedUpdatedAt?: string }) => api.updateTask(id, input, expectedUpdatedAt),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.deleteTask(id),
      onSuccess: refresh,
    }),
  };
}

export function useUserMutations() {
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['users'] }),
      client.invalidateQueries({ queryKey: ['directory'] }),
    ]);
  };
  return {
    create: useMutation({
      mutationFn: (input: CreateUserInput) => api.createUser(input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: string;
        input: Partial<Pick<User, 'role' | 'isActive' | 'name' | 'email'>>;
      }) => api.updateUser(id, input),
      onSuccess: refresh,
    }),
  };
}
