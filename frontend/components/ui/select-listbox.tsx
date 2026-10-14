'use client';

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

export function SelectListbox<T extends string>({
  value,
  onChange,
  options,
  disabled,
  'aria-label': ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<SelectOption<T>>;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={cn('relative', className)}>
        <ListboxButton
          aria-label={ariaLabel}
          className="relative w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3.5 pl-10 text-right text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:bg-slate-50"
        >
          <span className="block truncate">{selected?.label ?? 'انتخاب کنید'}</span>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        </ListboxButton>
        <ListboxOptions
          anchor="bottom start"
          className="z-50 mt-1 max-h-64 w-[var(--button-width)] overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg outline-none"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 data-[focus]:bg-indigo-50 data-[selected]:font-semibold"
            >
              {({ selected: isSelected }) => (
                <>
                  <span>{option.label}</span>
                  {isSelected && <Check size={14} className="text-indigo-600" />}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
