import { createHash } from 'node:crypto';
import type { SectionChange, SectionStatus } from '../types.js';

export interface RenderedSection {
  id: string;
  body: string;
}

export interface DocSegmentText {
  kind: 'text';
  raw: string;
}
export interface DocSegmentSection {
  kind: 'section';
  id: string;
  /** begin 标记里的 h;缺失(老版本/被人删了)按 null,判定时保守处理 */
  storedHash: string | null;
  body: string;
  raw: string;
}
export type DocSegment = DocSegmentText | DocSegmentSection;

export type ParseState = 'marked' | 'unmarked' | 'broken';

export interface ParsedDoc {
  state: ParseState;
  segments: DocSegment[];
}

const BEGIN_RE = /^<!--\s*ck:begin\s+([a-z0-9-]+)(?:\s+h=([0-9a-f]{8}))?\s*-->\s*$/;
const END_RE = /^<!--\s*ck:end\s+([a-z0-9-]+)\s*-->\s*$/;

/** 哈希前的规整:去首尾空行、去行尾空白——用户只动了空白不算改过。 */
export function normalizeBody(body: string): string {
  const lines = body.split('\n').map((l) => l.replace(/[ \t\r]+$/, ''));
  while (lines.length > 0 && lines[0] === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

export function sectionHash(body: string): string {
  return createHash('sha256').update(normalizeBody(body), 'utf8').digest('hex').slice(0, 8);
}

export function sectionBlock(id: string, body: string): string {
  const b = normalizeBody(body);
  return `<!-- ck:begin ${id} h=${sectionHash(b)} -->\n${b}\n<!-- ck:end ${id} -->`;
}

/** 全新文档:各节带标记,progress 等尾部内容不带标记(merge 永不碰它)。 */
export function composeDoc(sections: RenderedSection[], trailing?: string): string {
  const parts = sections.map((s) => sectionBlock(s.id, s.body));
  if (trailing !== undefined) parts.push(normalizeBody(trailing));
  return parts.join('\n\n') + '\n';
}

/**
 * 逐行解析标记文档。任何不成对/嵌套/交叉的标记都判 broken——绝不猜,
 * broken 与 unmarked 走同一条保守流程。
 */
export function parseDoc(text: string): ParsedDoc {
  const broken: ParsedDoc = { state: 'broken', segments: [{ kind: 'text', raw: text }] };
  const rawLines = text.split(/(?<=\n)/);
  const segments: DocSegment[] = [];
  let textBuf: string[] = [];
  let open: { id: string; storedHash: string | null; body: string[]; raw: string[] } | null = null;
  let sawMarker = false;

  const flushText = (): void => {
    if (textBuf.length > 0) {
      segments.push({ kind: 'text', raw: textBuf.join('') });
      textBuf = [];
    }
  };

  for (const rawLine of rawLines) {
    const line = rawLine.replace(/\r?\n$/, '');
    const beginMatch = BEGIN_RE.exec(line);
    const endMatch = END_RE.exec(line);
    if (beginMatch) {
      sawMarker = true;
      if (open !== null) return broken;
      flushText();
      open = {
        id: beginMatch[1] as string,
        storedHash: beginMatch[2] ?? null,
        body: [],
        raw: [rawLine],
      };
    } else if (endMatch) {
      sawMarker = true;
      if (open === null || open.id !== endMatch[1]) return broken;
      open.raw.push(rawLine);
      segments.push({
        kind: 'section',
        id: open.id,
        storedHash: open.storedHash,
        body: open.body.join(''),
        raw: open.raw.join(''),
      });
      open = null;
    } else if (open !== null) {
      open.body.push(rawLine);
      open.raw.push(rawLine);
    } else {
      textBuf.push(rawLine);
    }
  }
  if (open !== null) return broken;
  flushText();
  return { state: sawMarker ? 'marked' : 'unmarked', segments };
}

function statusOf(seg: DocSegmentSection | undefined, freshHash: string): SectionStatus {
  if (seg === undefined) return 'new';
  const currentHash = sectionHash(seg.body);
  // 盘上内容已经等于本次渲染 → 无事可做(哪怕是用户手动改成这样的)
  if (currentHash === freshHash) return 'unchanged';
  // 盘上内容仍等于上次写入(h 记录)→ 差异来自模板/配置更新,可安全替换
  if (seg.storedHash !== null && currentHash === seg.storedHash) return 'template-updated';
  // 其余一律视为用户改过(含 h 缺失的保守情形)→ 默认绝不覆盖
  return 'user-edited';
}

const DEFAULT_APPLY: Record<SectionStatus, boolean> = {
  unchanged: false,
  'template-updated': true,
  'user-edited': false,
  new: true,
};

/** 三态判定核心:对每个 fresh 节给出状态与默认 apply 策略(交互模式可再改 apply)。 */
export function diffSections(parsed: ParsedDoc, fresh: RenderedSection[]): SectionChange[] {
  const byId = new Map<string, DocSegmentSection>();
  for (const seg of parsed.segments) {
    if (seg.kind === 'section' && !byId.has(seg.id)) byId.set(seg.id, seg);
  }
  return fresh.map((s) => {
    const freshBody = normalizeBody(s.body);
    const freshHash = sectionHash(freshBody);
    const status = statusOf(byId.get(s.id), freshHash);
    return { id: s.id, status, fresh: freshBody, freshHash, apply: DEFAULT_APPLY[status] };
  });
}

/** 重组:被接受的节原位替换,新节追加文末,标记外内容一字节不动。 */
export function assemble(parsed: ParsedDoc, changes: SectionChange[]): string {
  const applied = new Map<string, SectionChange>();
  for (const c of changes) {
    if (c.apply && c.status !== 'new') applied.set(c.id, c);
  }
  let out = parsed.segments
    .map((seg) => {
      if (seg.kind === 'section') {
        const change = applied.get(seg.id);
        if (change !== undefined) {
          applied.delete(seg.id); // 同 id 重复出现时只替换第一个,其余原样保留
          const nl = seg.raw.endsWith('\n') ? '\n' : '';
          return sectionBlock(change.id, change.fresh) + nl;
        }
      }
      return seg.raw;
    })
    .join('');
  const appended = changes.filter((c) => c.apply && c.status === 'new');
  if (appended.length > 0) {
    const blocks = appended.map((c) => sectionBlock(c.id, c.fresh)).join('\n\n');
    out = (out.trim() === '' ? '' : out.replace(/\s+$/, '') + '\n\n') + blocks + '\n';
  }
  return out;
}

export interface AppendPlan {
  include: RenderedSection[];
  /** 因存量文档已有同名标题而跳过的节 */
  skipped: { id: string; heading: string }[];
}

/**
 * 无标记文档的「末尾追加」方案:凡存量文档已有同名标题(或已有任何 H1 时的 header 节)
 * 一律跳过,避免重复标题。
 */
export function planAppend(text: string, fresh: RenderedSection[]): AppendPlan {
  const lines = new Set(text.split('\n').map((l) => l.trim()));
  const hasH1 = text.split('\n').some((l) => /^#\s/.test(l));
  const include: RenderedSection[] = [];
  const skipped: { id: string; heading: string }[] = [];
  for (const s of fresh) {
    const heading = (normalizeBody(s.body).split('\n')[0] ?? '').trim();
    const duplicate = /^#\s/.test(heading) ? hasH1 : lines.has(heading);
    if (duplicate) skipped.push({ id: s.id, heading });
    else include.push(s);
  }
  return { include, skipped };
}

export function appendToUnmarked(text: string, sections: RenderedSection[]): string {
  const blocks = sections.map((s) => sectionBlock(s.id, s.body)).join('\n\n');
  return text.replace(/\s+$/, '') + '\n\n' + blocks + '\n';
}
