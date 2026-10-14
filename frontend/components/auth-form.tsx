'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('ایمیل معتبر وارد کنید'),
  password: z.string().min(1, 'رمز عبور را وارد کنید'),
});
type LoginValues = z.infer<typeof loginSchema>;

const sampleAccounts = [
  { role: 'مالک', email: 'owner@taskboard.local', password: 'OwnerPass123!' },
  { role: 'مدیر', email: 'manager@taskboard.local', password: 'ManagerPass123!' },
  { role: 'عضو', email: 'member@taskboard.local', password: 'MemberPass123!' },
];

// Local-development convenience; set NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false to hide.
const showDemoAccounts = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS !== 'false';

export function AuthForm({ onSuccess }: { onSuccess: () => void }) {
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const submit = async (values: LoginValues) => {
    setServerError('');
    try {
      await api.login(values.email, values.password);
      onSuccess();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'ورود ناموفق بود.');
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080b18] px-4 py-10 sm:px-6"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-violet-600/15 blur-[120px]" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_30px_100px_-25px_rgba(0,0,0,0.65)] md:grid-cols-2">
        {/* Branding panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-[#241451] p-10 text-white md:flex lg:p-12">
          <div className="absolute -left-20 top-32 h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute -left-10 top-42 h-44 w-44 rounded-full border border-white/10" />
          <div className="absolute bottom-16 right-10 h-48 w-48 rounded-full bg-violet-400/10 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm">
              <ShieldCheck size={26} />
            </div>
            <span className="text-sm font-bold tracking-wide text-white/90">
              فضای کاری امن
            </span>
          </div>

          <div className="relative z-10 py-12">
            <p className="mb-4 text-sm font-medium text-indigo-200">
              مدیریت متمرکز، تجربه‌ای ساده‌تر
            </p>

            <h1 className="text-5xl font-black tracking-tight lg:text-6xl">
              کاربان
            </h1>

            <p className="mt-6 max-w-sm text-sm leading-8 text-indigo-100/80">
              به فضای کاری خود دسترسی پیدا کنید و امور روزانه‌تان را در محیطی
              امن، منظم و یکپارچه مدیریت کنید.
            </p>

            <div className="mt-8 flex items-center gap-3 text-sm text-indigo-100/80">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                <ShieldCheck size={16} />
              </span>
              <span>ورود امن به حساب کاربری شما</span>
            </div>
          </div>

          <div className="relative z-10 border-t border-white/15 pt-5 text-xs text-indigo-200/70">
            کاربان · فضای کاری شما
          </div>
        </section>

        {/* Login form */}
        <section className="bg-white px-6 py-9 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
          <div className="mx-auto w-full max-w-md">
            {/* Mobile branding */}
            <div className="mb-8 flex items-center gap-3 md:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                <ShieldCheck size={23} />
              </div>
              <span className="text-xl font-black text-slate-900">کاربان</span>
            </div>

            <div className="mb-8">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                خوش آمدید
              </span>

              <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                ورود به فضای کاری
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-500">
                برای ادامه، اطلاعات حساب کاربری خود را وارد کنید.
              </p>
            </div>

            <form onSubmit={handleSubmit(submit)} className="space-y-5">
              <div>
                <label
                  className="mb-2 block text-sm font-bold text-slate-700"
                  htmlFor="email"
                >
                  ایمیل
                </label>

                <div className="relative">
                  <Mail
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <Input
                    id="email"
                    dir="ltr"
                    autoComplete="username"
                    type="email"
                    placeholder="you@example.com"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/70 pr-11 text-left text-sm transition-colors focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-500/10"
                    {...register("email")}
                  />
                </div>

                {errors.email && (
                  <p className="mt-2 text-xs font-medium text-rose-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  className="mb-2 block text-sm font-bold text-slate-700"
                  htmlFor="password"
                >
                  رمز عبور
                </label>

                <div className="relative">
                  <LockKeyhole
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <Input
                    id="password"
                    dir="ltr"
                    autoComplete="current-password"
                    type="password"
                    placeholder="رمز عبور خود را وارد کنید"
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/70 pr-11 text-left text-sm transition-colors focus-visible:border-indigo-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-indigo-500/10"
                    {...register("password")}
                  />
                </div>

                {errors.password && (
                  <p className="mt-2 text-xs font-medium text-rose-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
                >
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-600/30 disabled:opacity-60"
              >
                {isSubmitting ? "در حال ورود…" : "ورود به حساب کاربری"}
              </Button>
            </form>

            {showDemoAccounts && (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-800">
                    حساب‌های نمونه
                  </p>
                  <span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                    محیط توسعه
                  </span>
                </div>

                <div className="space-y-2">
                  {sampleAccounts.map((account) => (
                    <button
                      type="button"
                      key={account.email}
                      onClick={() => {
                        setValue("email", account.email, {
                          shouldValidate: true,
                        });
                        setValue("password", account.password, {
                          shouldValidate: true,
                        });
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent bg-white px-3 py-3 text-right transition-colors hover:border-indigo-200 hover:bg-indigo-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <span className="shrink-0 text-xs font-bold text-slate-700">
                        {account.role}
                      </span>
                      <span
                        dir="ltr"
                        className="truncate text-xs text-slate-500"
                      >
                        {account.email}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-8 text-center text-xs leading-6 text-slate-400">
              دسترسی به حساب‌ها توسط مدیر سیستم مدیریت می‌شود.
            </p>
          </div>
        </section>
      </div>
    </main>

  );
}
