'use client';

import { Dialog, DialogPanel, DialogTitle, Transition } from '@headlessui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectListbox } from '@/components/ui/select-listbox';
import { useUserMutations } from '@/lib/queries';
import {
  createUserSchema,
  roleLabels,
  type CreateUserInput,
  type User,
  type UserRole,
} from '@/lib/tasks';

export function UsersPanel({ users, currentUser }: { users: User[]; currentUser: User }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const mutations = useUserMutations();

  const changeRole = async (user: User, role: UserRole) => {
    try {
      await mutations.update.mutateAsync({ id: user.id, input: { role } });
      setNotice('نقش کاربر به‌روزرسانی شد.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'به‌روزرسانی نقش ناموفق بود.');
    }
  };

  const toggleActive = async (user: User) => {
    try {
      await mutations.update.mutateAsync({
        id: user.id,
        input: { isActive: !user.isActive },
      });
      setNotice(user.isActive ? 'کاربر غیرفعال شد.' : 'کاربر فعال شد.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'تغییر وضعیت کاربر ناموفق بود.');
    }
  };

  return (
    <Card className="mb-6 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">مدیریت کاربران</h2>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus size={16} />
          کاربر جدید
        </Button>
      </div>
      {notice && <p className="mb-3 text-sm text-indigo-700">{notice}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="text-xs text-slate-400">
            <tr>
              <th className="py-2 font-medium">نام</th>
              <th className="py-2 font-medium">ایمیل</th>
              <th className="py-2 font-medium">نقش</th>
              <th className="py-2 font-medium">وضعیت</th>
              <th className="py-2 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="py-3 font-semibold">{user.name}</td>
                <td className="py-3 text-slate-500" dir="ltr">
                  {user.email}
                </td>
                <td className="py-3 pl-4">
                  {user.id === currentUser.id ? (
                    roleLabels[user.role]
                  ) : (
                    <SelectListbox<UserRole>
                      aria-label={'نقش ' + user.name}
                      value={user.role}
                      onChange={(role) => void changeRole(user, role)}
                      options={(Object.keys(roleLabels) as UserRole[])
                        .filter((role) => role !== 'owner' || user.role === 'owner')
                        .map((role) => ({ value: role, label: roleLabels[role] }))}
                      className="min-w-30"
                    />
                  )}
                </td>
                <td className="py-3">
                  <Badge className={user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                    {user.isActive ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </td>
                <td className="py-3">
                  <Button
                    variant={user.isActive ? 'danger' : 'secondary'}
                    className="min-h-9 px-3 text-xs"
                    disabled={user.id === currentUser.id}
                    onClick={() => void toggleActive(user)}
                  >
                    {user.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CreateUserDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => setNotice('کاربر جدید ساخته شد.')}
      />
    </Card>
  );
}

function CreateUserDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const mutations = useUserMutations();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '', password: '', role: 'member' },
  });

  const submit = async (values: CreateUserInput) => {
    setServerError('');
    try {
      await mutations.create.mutateAsync(values);
      reset();
      onCreated();
      onClose();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'ساخت کاربر ناموفق بود.');
    }
  };

  return (
    <Transition show={open}>
      <Dialog onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-slate-950/40" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <DialogTitle className="text-lg font-black">ایجاد کاربر</DialogTitle>
            <form
              className="mt-5 space-y-4"
              onSubmit={handleSubmit(submit, () => undefined)}
            >
              <div>
                <label htmlFor="user-name" className="mb-2 block text-sm font-semibold">نام</label>
                <Input id="user-name" {...register('name')} />
                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="user-email" className="mb-2 block text-sm font-semibold">ایمیل</label>
                <Input id="user-email" dir="ltr" className="text-left" type="email" {...register('email')} />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="user-password" className="mb-2 block text-sm font-semibold">رمز عبور موقت</label>
                <Input id="user-password" dir="ltr" autoComplete="new-password" className="text-left" type="password" {...register('password')} />
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">نقش</label>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <SelectListbox<'manager' | 'member'>
                      aria-label="نقش کاربر"
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: 'manager', label: 'مدیر' },
                        { value: 'member', label: 'عضو' },
                      ]}
                    />
                  )}
                />
              </div>
              {serverError && (
                <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{serverError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  ذخیره
                </Button>
                <Button type="button" variant="secondary" onClick={onClose}>
                  انصراف
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </Transition>
  );
}
