export class TemplateError extends Error {
  constructor(message: string, template?: string) {
    super(template ? `${template}: ${message}` : message);
    this.name = 'TemplateError';
  }
}

export type TemplateVars = Record<string, string | boolean>;

type Token =
  | { t: 'text'; s: string }
  | { t: 'var'; name: string }
  | { t: 'if'; name: string }
  | { t: 'else' }
  | { t: 'end' };

type Node =
  | { t: 'text'; s: string }
  | { t: 'var'; name: string }
  | { t: 'if'; name: string; then: Node[]; els: Node[] };

const NAME = '[A-Za-z][A-Za-z0-9_]*';
const TAG_RE = new RegExp(`\\{\\{(#if ${NAME}|\\/if|else|${NAME})\\}\\}`, 'g');
// 独占一行的块标签({{#if}}/{{else}}/{{/if}}):整行移除,避免渲染后留下多余空行
const STANDALONE_RE = new RegExp(`^[ \\t]*(\\{\\{(?:#if ${NAME}|else|\\/if)\\}\\})[ \\t]*\\r?\\n`, 'gm');

function tokenize(tpl: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(tpl)) !== null) {
    if (m.index > last) tokens.push({ t: 'text', s: tpl.slice(last, m.index) });
    const tag = m[1] as string;
    if (tag.startsWith('#if ')) tokens.push({ t: 'if', name: tag.slice(4) });
    else if (tag === '/if') tokens.push({ t: 'end' });
    else if (tag === 'else') tokens.push({ t: 'else' });
    else tokens.push({ t: 'var', name: tag });
    last = m.index + m[0].length;
  }
  if (last < tpl.length) tokens.push({ t: 'text', s: tpl.slice(last) });
  return tokens;
}

function parseNodes(
  tokens: Token[],
  cursor: { i: number },
  insideIf: string | null,
  src?: string,
): { nodes: Node[]; closed: 'end' | 'else' | 'eof' } {
  const nodes: Node[] = [];
  while (cursor.i < tokens.length) {
    const tok = tokens[cursor.i] as Token;
    cursor.i++;
    if (tok.t === 'text' || tok.t === 'var') {
      nodes.push(tok);
    } else if (tok.t === 'if') {
      const thenPart = parseNodes(tokens, cursor, tok.name, src);
      let els: Node[] = [];
      if (thenPart.closed === 'else') {
        const elsePart = parseNodes(tokens, cursor, tok.name, src);
        if (elsePart.closed !== 'end') {
          throw new TemplateError(`{{#if ${tok.name}}} 没有对应的 {{/if}}`, src);
        }
        els = elsePart.nodes;
      } else if (thenPart.closed !== 'end') {
        throw new TemplateError(`{{#if ${tok.name}}} 没有对应的 {{/if}}`, src);
      }
      nodes.push({ t: 'if', name: tok.name, then: thenPart.nodes, els });
    } else if (tok.t === 'else') {
      if (insideIf === null) throw new TemplateError('{{else}} 出现在 {{#if}} 之外', src);
      return { nodes, closed: 'else' };
    } else {
      if (insideIf === null) throw new TemplateError('多余的 {{/if}}', src);
      return { nodes, closed: 'end' };
    }
  }
  if (insideIf !== null) {
    throw new TemplateError(`{{#if ${insideIf}}} 没有对应的 {{/if}}`, src);
  }
  return { nodes, closed: 'eof' };
}

function evalNodes(nodes: Node[], vars: TemplateVars, src?: string): string {
  let out = '';
  for (const node of nodes) {
    if (node.t === 'text') {
      out += node.s;
    } else if (node.t === 'var') {
      const value = vars[node.name];
      if (value === undefined) throw new TemplateError(`缺少变量 {{${node.name}}}`, src);
      if (typeof value !== 'string') {
        throw new TemplateError(`变量 {{${node.name}}} 是布尔值,不能作为文本插值`, src);
      }
      out += value;
    } else {
      const value = vars[node.name];
      if (value === undefined) throw new TemplateError(`缺少条件变量 {{#if ${node.name}}}`, src);
      if (typeof value !== 'boolean') {
        throw new TemplateError(`条件变量 {{#if ${node.name}}} 必须是布尔值`, src);
      }
      out += evalNodes(value ? node.then : node.els, vars, src);
    }
  }
  return out;
}

/** 提取模板里用到的插槽(templates.test 用它做 zh/en 一致性与白名单校验)。 */
export function extractSlots(tpl: string): { vars: Set<string>; flags: Set<string> } {
  const vars = new Set<string>();
  const flags = new Set<string>();
  for (const tok of tokenize(tpl)) {
    if (tok.t === 'var') vars.add(tok.name);
    if (tok.t === 'if') flags.add(tok.name);
  }
  return { vars, flags };
}

export function render(tpl: string, vars: TemplateVars, src?: string): string {
  const tokens = tokenize(tpl.replace(STANDALONE_RE, '$1'));
  const cursor = { i: 0 };
  const { nodes } = parseNodes(tokens, cursor, null, src);
  return evalNodes(nodes, vars, src);
}
