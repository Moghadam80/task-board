type DashboardNoticeProps = {
  notice: string | null;
};

export function DashboardNotice({ notice }: DashboardNoticeProps) {
  if (!notice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm leading-6 text-indigo-800"
    >
      {notice}
    </div>
  );
}