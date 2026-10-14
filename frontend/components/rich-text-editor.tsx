'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading1, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote } from 'lucide-react';
import { useEffect } from 'react';
import type { TipTapDocument } from '@/lib/tasks';

function isAllowedHref(href: string) {
  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const tiptapExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    code: false,
    codeBlock: false,
    strike: false,
    underline: false,
    horizontalRule: false,
    link: {
      openOnClick: false,
      protocols: ['http', 'https'],
      validate: (href: string) => isAllowedHref(href),
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    },
  }),
];

export function RichTextEditor({
  value,
  onChange,
}: {
  value: TipTapDocument;
  onChange: (value: TipTapDocument) => void;
}) {
  const editor = useEditor({
    extensions: tiptapExtensions,
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'editor-content text-sm leading-7 text-slate-700',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'توضیحات',
      },
    },
    onUpdate: ({ editor: next }) => onChange(next.getJSON() as TipTapDocument),
  });

  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="h-32 animate-pulse rounded-xl bg-slate-50" />;
  }

  const actions = [
    {
      label: 'پررنگ',
      icon: <Bold size={15} />,
      run: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
    },
    {
      label: 'کج',
      icon: <Italic size={15} />,
      run: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
    },
    {
      label: 'عنوان ۱',
      icon: <Heading1 size={15} />,
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive('heading', { level: 1 }),
    },
    {
      label: 'عنوان ۲',
      icon: <Heading2 size={15} />,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
    },
    {
      label: 'عنوان ۳',
      icon: <Heading3 size={15} />,
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive('heading', { level: 3 }),
    },
    {
      label: 'فهرست',
      icon: <List size={15} />,
      run: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
    },
    {
      label: 'فهرست شماره‌دار',
      icon: <ListOrdered size={15} />,
      run: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
    },
    {
      label: 'نقل‌قول',
      icon: <Quote size={15} />,
      run: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive('blockquote'),
    },
    {
      label: 'لینک',
      icon: <Link2 size={15} />,
      run: () => {
        const href = window.prompt('آدرس لینک http یا https را وارد کنید');
        if (!href) {
          editor.chain().focus().unsetLink().run();
          return;
        }
        if (!isAllowedHref(href)) {
          window.alert('فقط لینک‌های HTTP و HTTPS مجاز هستند.');
          return;
        }
        editor.chain().focus().setLink({ href }).run();
      },
      active: editor.isActive('link'),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
      <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50/80 p-2">
        {actions.map((action) => (
          <button
            type="button"
            key={action.label}
            aria-label={action.label}
            title={action.label}
            onClick={action.run}
            aria-pressed={action.active}
            className={
              'rounded-lg p-2 ' +
              (action.active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-white')
            }
          >
            {action.icon}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
