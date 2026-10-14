import { registerDecorator, type ValidationOptions } from 'class-validator';

/** 'YYYY-MM-DD' that is a real calendar date (rejects 2026-02-30). */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function IsCalendarDate(options?: ValidationOptions) {
  return (target: object, propertyName: string): void => {
    registerDecorator({
      name: 'isCalendarDate',
      target: target.constructor,
      propertyName,
      options: { message: 'تاریخ مهلت معتبر نیست (قالب YYYY-MM-DD).', ...options },
      validator: { validate: (value: unknown) => isCalendarDate(value) },
    });
  };
}
