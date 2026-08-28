export interface SettingsMergeResult {
  merged: Record<string, unknown>;
  changed: boolean;
  /** 预览用:每行一条本次会新增的内容 */
  addedLines: string[];
  /** 类型/标量冲突(保留现有值)的路径 */
  conflicts: string[];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 只增不改的深合并:对象逐键递归、数组做保序并集、标量与类型冲突一律保留现有值。
 * 这套规则保证非交互模式下直接应用也安全。
 */
export function mergeSettings(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): SettingsMergeResult {
  const addedLines: string[] = [];
  const conflicts: string[] = [];

  function mergeValue(a: unknown, b: unknown, path: string): unknown {
    if (a === undefined) {
      addedLines.push(`${path} = ${JSON.stringify(b)}`);
      return b;
    }
    if (isPlainObject(a) && isPlainObject(b)) {
      const out: Record<string, unknown> = { ...a };
      for (const key of Object.keys(b)) {
        out[key] = mergeValue(a[key], b[key], path === '' ? key : `${path}.${key}`);
      }
      return out;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      const seen = new Set(a.map((item) => JSON.stringify(item)));
      const out = [...a];
      for (const item of b) {
        if (!seen.has(JSON.stringify(item))) {
          seen.add(JSON.stringify(item));
          out.push(item);
          addedLines.push(`${path} += ${JSON.stringify(item)}`);
        }
      }
      return out;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) conflicts.push(path);
    return a;
  }

  const merged = mergeValue(existing, incoming, '') as Record<string, unknown>;
  return { merged, changed: addedLines.length > 0, addedLines, conflicts };
}

export function serializeSettings(settings: Record<string, unknown>): string {
  return JSON.stringify(settings, null, 2) + '\n';
}
