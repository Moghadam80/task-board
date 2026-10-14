import { cn } from '@/lib/utils';

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_30px_-20px_rgba(15,23,42,.28)]',
        className,
      )}
    >
      {children}
    </section>
  );
}
