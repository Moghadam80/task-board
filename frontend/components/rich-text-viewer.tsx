'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect } from 'react';
import { tiptapExtensions } from '@/components/rich-text-editor';
import type { TipTapDocument } from '@/lib/tasks';

export function RichTextViewer({
  value,
  className,
}: {
  value: TipTapDocument;
  className?: string;
}) {
  const editor = useEditor({
    extensions: tiptapExtensions,
    content: value,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'editor-content editor-readonly text-xs leading-6 text-slate-500 ' + (className ?? ''),
      },
    },
  });

  useEffect(() => {
    if (editor) editor.commands.setContent(value);
  }, [editor, value]);

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}
