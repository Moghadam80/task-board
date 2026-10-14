import { BadRequestException } from '@nestjs/common';

/**
 * Server-side validation of a TipTap / ProseMirror JSON document.
 * The JSON is the single source of truth (HTML is never stored), so the API
 * must be strict about what may be persisted:
 *  - whitelisted node + mark types, whitelisted attributes per type
 *  - structural rules (what may be a child of what), depth / size limits
 *  - links: only http: and https: URLs
 *  - an empty document (`{ type: 'doc' }` / `content: []`) is valid
 */

const BLOCKS = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'blockquote',
] as const;

const ALLOWED_CHILDREN: Record<string, ReadonlySet<string>> = {
  doc: new Set(BLOCKS),
  paragraph: new Set(['text', 'hardBreak']),
  heading: new Set(['text', 'hardBreak']),
  bulletList: new Set(['listItem']),
  orderedList: new Set(['listItem']),
  listItem: new Set(BLOCKS),
  blockquote: new Set(BLOCKS),
  text: new Set(),
  hardBreak: new Set(),
};

const NODE_KEYS = new Set(['type', 'content', 'attrs', 'marks', 'text']);
const MARK_TYPES = new Set(['bold', 'italic', 'link']);
const LINK_ATTR_KEYS = new Set(['href', 'target', 'rel', 'class']);
const ORDERED_LIST_TYPES = new Set(['1', 'a', 'A', 'i', 'I']);

const MAX_NODES = 2_000;
const MAX_DEPTH = 24;
const MAX_TEXT_LENGTH = 20_000;
const MAX_HREF_LENGTH = 2_048;

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const EMPTY_TIPTAP_DOCUMENT = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

function fail(message: string): never {
  throw new BadRequestException(message);
}

function assertKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  message: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(message);
  }
}

function checkNodeAttrs(type: string, attrs: unknown): void {
  if (attrs === undefined || attrs === null) {
    if (type === 'heading') fail('سطح عنوان لازم است.');
    return;
  }
  if (!isObject(attrs)) fail('ویژگی‌های نود TipTap نامعتبر هستند.');
  const a = attrs as Record<string, unknown>;

  if (type === 'heading') {
    assertKeys(a, new Set(['level']), 'ویژگی نامعتبر برای عنوان.');
    if (!Number.isInteger(a.level) || ![1, 2, 3].includes(a.level as number)) {
      fail('فقط سطوح ۱ تا ۳ عنوان پشتیبانی می‌شوند.');
    }
    return;
  }

  if (type === 'orderedList') {
    assertKeys(
      a,
      new Set(['start', 'type']),
      'ویژگی نامعتبر برای فهرست شماره‌دار.',
    );
    if (
      a.start !== undefined &&
      a.start !== null &&
      (!Number.isInteger(a.start) ||
        (a.start as number) < 0 ||
        (a.start as number) > 1_000_000)
    ) {
      fail('شروع فهرست شماره‌دار نامعتبر است.');
    }
    if (
      a.type !== undefined &&
      a.type !== null &&
      !(typeof a.type === 'string' && ORDERED_LIST_TYPES.has(a.type))
    ) {
      fail('نوع فهرست شماره‌دار نامعتبر است.');
    }
    return;
  }

  if (Object.keys(a).length > 0) {
    fail('این نود TipTap ویژگی اضافه نمی‌پذیرد.');
  }
}

function checkLinkHref(href: unknown): void {
  if (typeof href !== 'string' || href.length === 0) {
    fail('آدرس لینک لازم است.');
  }
  if ((href as string).length > MAX_HREF_LENGTH) {
    fail('آدرس لینک بیش از حد طولانی است.');
  }

  let url: URL;
  try {
    url = new URL(href as string);
  } catch {
    return fail('لینک باید نشانی URL معتبر داشته باشد.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    fail('فقط لینک‌های HTTP و HTTPS مجاز هستند.');
  }
}

function checkMark(mark: unknown): void {
  if (
    !isObject(mark) ||
    typeof mark.type !== 'string' ||
    !MARK_TYPES.has(mark.type)
  ) {
    fail('نوع نشانه TipTap پشتیبانی نمی‌شود.');
  }
  const m = mark as Record<string, unknown>;
  assertKeys(m, new Set(['type', 'attrs']), 'نشانه TipTap نامعتبر است.');

  if (m.type === 'link') {
    if (!isObject(m.attrs)) fail('آدرس لینک لازم است.');
    const attrs = m.attrs as Record<string, unknown>;
    assertKeys(attrs, LINK_ATTR_KEYS, 'ویژگی نامعتبر برای لینک.');
    checkLinkHref(attrs.href);
    if (
      attrs.target !== undefined &&
      attrs.target !== null &&
      attrs.target !== '_blank' &&
      attrs.target !== '_self'
    ) {
      fail('مقدار target لینک نامعتبر است.');
    }
    if (
      attrs.rel !== undefined &&
      attrs.rel !== null &&
      (typeof attrs.rel !== 'string' || attrs.rel.length > 200)
    ) {
      fail('مقدار rel لینک نامعتبر است.');
    }
    if (attrs.class !== undefined && attrs.class !== null) {
      fail('کلاس برای لینک مجاز نیست.');
    }
    return;
  }

  // bold / italic carry no attributes
  if (isObject(m.attrs) && Object.keys(m.attrs).length > 0) {
    fail('این نشانه TipTap ویژگی اضافه نمی‌پذیرد.');
  }
}

export function validateTiptapDocument(
  value: unknown,
): Record<string, unknown> {
  if (!isObject(value) || value.type !== 'doc') {
    fail('توضیحات باید یک سند JSON معتبر TipTap باشد.');
  }

  let nodeCount = 0;

  const visit = (node: unknown, depth: number, parentType?: string): void => {
    nodeCount += 1;
    if (nodeCount > MAX_NODES || depth > MAX_DEPTH) {
      fail('سند TipTap بیش از حد بزرگ است.');
    }

    if (
      !isObject(node) ||
      typeof node.type !== 'string' ||
      !Object.hasOwn(ALLOWED_CHILDREN, node.type)
    ) {
      return fail('نوع نود TipTap پشتیبانی نمی‌شود.');
    }
    const n = node as Record<string, unknown>;
    const type = n.type as string;
    assertKeys(n, NODE_KEYS, 'کلید ناشناخته در نود TipTap.');

    if (parentType && !ALLOWED_CHILDREN[parentType].has(type)) {
      fail('ساختار سند TipTap مجاز نیست.');
    }

    checkNodeAttrs(type, n.attrs);

    if (type === 'text') {
      if (typeof n.text !== 'string' || n.text.length === 0) {
        fail('نودهای متنی باید شامل متن باشند.');
      }
      if ((n.text as string).length > MAX_TEXT_LENGTH) {
        fail('متن توضیحات بیش از حد طولانی است.');
      }
      if (n.content !== undefined) fail('نود متنی نمی‌تواند فرزند داشته باشد.');
    } else if (n.text !== undefined) {
      fail('فقط نود متنی می‌تواند text داشته باشد.');
    }

    if (n.marks !== undefined) {
      if (type !== 'text') fail('نشانه فقط روی متن مجاز است.');
      if (!Array.isArray(n.marks)) fail('نشانه‌های TipTap نامعتبر هستند.');
      (n.marks as unknown[]).forEach(checkMark);
    }

    if (n.content !== undefined) {
      if (!Array.isArray(n.content)) fail('محتوای TipTap نامعتبر است.');
      for (const child of n.content as unknown[]) {
        visit(child, depth + 1, type);
      }
    }
  };

  visit(value, 0);
  return value as Record<string, unknown>;
}
